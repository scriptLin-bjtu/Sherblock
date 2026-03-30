/**
 * Generate Markdown Report Skill
 *
 * Generates a structured markdown analysis report from the current workflow
 * scope and saves it to the project's `reports/` directory.
 */

import { writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

/**
 * Generate a timestamp string for filenames: YYYYMMDD-HHmmss
 */
function formatTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        "-" +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

/**
 * Build a markdown section from a key-value object (max depth 2).
 */
function renderObject(obj, indent = "") {
    if (obj === null || obj === undefined) return "_N/A_";
    if (typeof obj !== "object") return String(obj);
    if (Array.isArray(obj)) {
        if (obj.length === 0) return "_empty_";
        return obj
            .map((item) =>
                typeof item === "object"
                    ? `\n${indent}- ${renderObject(item, indent + "  ")}`
                    : `\n${indent}- ${item}`,
            )
            .join("");
    }
    const entries = Object.entries(obj);
    if (entries.length === 0) return "_empty_";
    return entries
        .map(([k, v]) => {
            const val =
                typeof v === "object" && v !== null
                    ? `\n${indent}  ${renderObject(v, indent + "  ")}`
                    : ` ${v}`;
            return `\n${indent}- **${k}**:${val}`;
        })
        .join("");
}

/**
 * Get all SVG files from the charts directory.
 * Returns an array of SVG filenames, or empty array if the directory doesn't exist or has no SVG files.
 */
async function getChartFiles() {
    try {
        if (!workspaceManager.isInitialized()) {
            return [];
        }
        const chartsPath = workspaceManager.getChartsPath();
        const files = await readdir(chartsPath);
        return files.filter((file) => file.toLowerCase().endsWith(".svg"));
    } catch (error) {
        // charts directory doesn't exist or can't be read
        return [];
    }
}

/**
 * Build the charts section markdown content from SVG file list.
 * Uses relative path ../charts/ to access charts from reports directory.
 */
function buildChartsSection(chartFiles) {
    if (!chartFiles || chartFiles.length === 0) {
        return "";
    }

    let section = "## Visualization Charts\n\n";

    for (const file of chartFiles) {
        // Extract title from filename (remove .svg extension)
        const title = file.replace(/\.svg$/i, "");
        section += `![${title}](../charts/${file})\n\n`;
    }

    return section;
}

/**
 * Build the complete markdown report content from scope + optional extra sections.
 */
function buildMarkdownReport(title, scope, extraSections = [], chartFiles = []) {
    const now = new Date();
    const lines = [];

    // Title & metadata
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(`> **Generated at**: ${now.toLocaleString("en-US")}  `);
    if (workspaceManager.isInitialized()) {
        lines.push(
            `> **Workspace ID**: ${workspaceManager.getWorkspaceId()}  `,
        );
    }
    lines.push("");
    lines.push("---");
    lines.push("");

    // Table of contents
    lines.push("## Table of Contents");
    lines.push("");
    lines.push("1. [Analysis Summary](#analysis-summary)");
    lines.push("2. [Analysis Goals](#analysis-goals)");
    lines.push("3. [Key Findings](#key-findings)");
    lines.push("4. [Detailed Data](#detailed-data)");
    // Add charts section to TOC if charts exist
    if (chartFiles.length > 0) {
        lines.push("5. [Visualization Charts](#visualization-charts)");
    }
    if (extraSections.length > 0) {
        const baseIndex = 5 + (chartFiles.length > 0 ? 1 : 0);
        extraSections.forEach((s, i) => {
            lines.push(
                `${baseIndex + i}. [${s.heading}](#${s.heading.replace(/\s+/g, "-")})`,
            );
        });
    }
    lines.push("");
    lines.push("---");
    lines.push("");

    // 1. Summary
    lines.push("## Analysis Summary");
    lines.push("");
    const summary =
        scope?.summary || scope?.analysis_summary || scope?.conclusion || null;
    if (summary) {
        lines.push(
            typeof summary === "string" ? summary : renderObject(summary),
        );
    } else {
        lines.push("_No summary information available. Please refer to the detailed data below._");
    }
    lines.push("");

    // 2. Goals
    lines.push("## Analysis Goals");
    lines.push("");
    const goal = scope?.goal || scope?.target || scope?.analysis_goal || null;
    if (goal) {
        lines.push(typeof goal === "string" ? goal : renderObject(goal));
    } else {
        lines.push("_No analysis goals recorded._");
    }
    lines.push("");

    // 3. Key findings
    lines.push("## Key Findings");
    lines.push("");
    const findings =
        scope?.findings || scope?.key_findings || scope?.results || null;
    if (findings) {
        if (Array.isArray(findings)) {
            findings.forEach((f, i) => {
                lines.push(`### Finding ${i + 1}`);
                lines.push("");
                lines.push(typeof f === "string" ? f : renderObject(f));
                lines.push("");
            });
        } else {
            lines.push(
                typeof findings === "string"
                    ? findings
                    : renderObject(findings),
            );
        }
    } else {
        lines.push("_No key findings recorded._");
    }
    lines.push("");

    // 4. Detailed data - all remaining scope keys
    lines.push("## Detailed Data");
    lines.push("");
    const skippedKeys = new Set([
        "summary",
        "analysis_summary",
        "conclusion",
        "goal",
        "target",
        "analysis_goal",
        "findings",
        "key_findings",
        "results",
    ]);
    const detailEntries = Object.entries(scope || {}).filter(
        ([k]) => !skippedKeys.has(k),
    );
    if (detailEntries.length === 0) {
        lines.push("_No detailed data available._");
    } else {
        detailEntries.forEach(([key, value]) => {
            lines.push(`### ${key}`);
            lines.push("");
            if (typeof value === "string") {
                lines.push(value);
            } else if (typeof value === "object" && value !== null) {
                lines.push("```json");
                lines.push(JSON.stringify(value, null, 2).slice(0, 3000));
                lines.push("```");
            } else {
                lines.push(String(value));
            }
            lines.push("");
        });
    }

    // Charts section (if SVG files exist)
    if (chartFiles.length > 0) {
        const chartsSection = buildChartsSection(chartFiles);
        lines.push(chartsSection);
    }

    // Extra custom sections
    extraSections.forEach((section) => {
        lines.push(`## ${section.heading}`);
        lines.push("");
        lines.push(
            typeof section.content === "string"
                ? section.content
                : renderObject(section.content),
        );
        lines.push("");
    });

    lines.push("---");
    lines.push("");
    lines.push("*This report was automatically generated by the Sherblock Blockchain Behavior Analysis System*");

    return lines.join("\n");
}

export default {
    name: "GENERATE_MARKDOWN_REPORT",

    description:
        "Generate a structured markdown analysis report file and save it to the project's reports/ directory. If the content parameter is provided, use the custom content directly; otherwise, generate a report from the scope containing summary, goals, key findings, and detailed data. IMPORTANT: The 'content' parameter should NOT contain any image references (markdown image syntax like ![alt](path)). Images will be automatically loaded and inserted by the system code from the charts/ directory.",

    category: "report",

    params: {
        required: ["title"],
        optional: ["filename", "summary", "sections", "content"],
    },

    whenToUse: [
        "Analysis is complete and a formal report document is needed",
        "Analysis results need to be exported to a Markdown file",
        "Analysis report needs to be saved to the local file system",
        "End of analysis phase to summarize all findings and output a report",
    ],

    async execute(params, context) {
        const { title, filename, summary, sections, content } = params;

        try {
            // Validate content - should not contain image references
            if (content && typeof content === 'string') {
                const imagePattern = /!\[([^\]]*)\]\([^)]+\)/g;
                const images = content.match(imagePattern);
                if (images && images.length > 0) {
                    console.warn(
                        `[GENERATE_MARKDOWN_REPORT] Content contains ${images.length} image reference(s). Images will be automatically inserted by system code. Found: ${images.slice(0, 2).join(', ')}${images.length > 2 ? '...' : ''}`
                    );
                }
            }
            // Determine output directory: use workspace reports dir if available,
            // otherwise fall back to {cwd}/reports/
            let reportDir;
            if (workspaceManager.isInitialized()) {
                reportDir = workspaceManager.getReportsPath();
            } else {
                reportDir = join(process.cwd(), "reports");
            }
            await mkdir(reportDir, { recursive: true });

            // Determine output filename
            const ts = formatTimestamp();
            const outputFilename = filename
                ? filename.endsWith(".md")
                    ? filename
                    : `${filename}.md`
                : `report-${ts}.md`;
            const outputPath = join(reportDir, outputFilename);

            // Load current scope (prefer scopeManager, fall back to empty)
            let scope = scopeManager.get();
            if (!scope) {
                scope = await scopeManager.read();
            }
            scope = scope || {};

            // Merge optional summary into scope if provided
            if (summary) {
                scope = { ...scope, summary };
            }

            // If custom content is provided, use it directly
            // Otherwise build report from scope
            let markdownContent;
            if (content && typeof content === "string") {
                // Use provided content directly
                markdownContent = content;

                // If content doesn't have visualization charts section but charts exist, append it
                const chartFiles = await getChartFiles();
                if (chartFiles.length > 0 && !content.includes("## Visualization Charts")) {
                    const chartsSection = buildChartsSection(chartFiles);
                    markdownContent += "\n\n---\n\n" + chartsSection + "\n";
                }

                // Ensure footer exists
                if (!content.includes("Sherblock")) {
                    markdownContent += "\n\n---\n\n*This report was automatically generated by the Sherblock Blockchain Behavior Analysis System*";
                }
            } else {
                // Build extra sections
                const extraSections = Array.isArray(sections) ? sections : [];

                // Get SVG chart files from charts directory
                const chartFiles = await getChartFiles();

                // Build and write markdown
                markdownContent = buildMarkdownReport(
                    title,
                    scope,
                    extraSections,
                    chartFiles,
                );
            }
            await writeFile(outputPath, markdownContent, "utf-8");

            console.log(
                `[GENERATE_MARKDOWN_REPORT] Report saved to: ${outputPath}`,
            );

            return {
                type: "OBSERVATION",
                content: {
                    skill: "GENERATE_MARKDOWN_REPORT",
                    success: true,
                    data: {
                        message: `Report generated and saved to reports/ directory`,
                        filePath: outputPath,
                        filename: outputFilename,
                        reportDir,
                        scopeKeysIncluded: Object.keys(scope),
                        charCount: markdownContent.length,
                    },
                },
            };
        } catch (error) {
            console.error("[GENERATE_MARKDOWN_REPORT] Error:", error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: "GENERATE_MARKDOWN_REPORT",
                    success: false,
                    error: error.message,
                },
            };
        }
    },
};
