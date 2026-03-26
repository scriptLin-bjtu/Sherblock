/**
 * Generate Markdown Report Skill
 *
 * Generates a structured markdown analysis report from the current workflow
 * scope and saves it to the project root's `report/` directory.
 */

import { writeFile, mkdir } from "fs/promises";
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
 * Build the complete markdown report content from scope + optional extra sections.
 */
function buildMarkdownReport(title, scope, extraSections = []) {
    const now = new Date();
    const lines = [];

    // Title & metadata
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(`> **生成时间**: ${now.toLocaleString("zh-CN")}  `);
    if (workspaceManager.isInitialized()) {
        lines.push(
            `> **Workspace ID**: ${workspaceManager.getWorkspaceId()}  `,
        );
    }
    lines.push("");
    lines.push("---");
    lines.push("");

    // Table of contents
    lines.push("## 目录");
    lines.push("");
    lines.push("1. [分析摘要](#分析摘要)");
    lines.push("2. [分析目标](#分析目标)");
    lines.push("3. [关键发现](#关键发现)");
    lines.push("4. [详细数据](#详细数据)");
    if (extraSections.length > 0) {
        extraSections.forEach((s, i) => {
            lines.push(
                `${5 + i}. [${s.heading}](#${s.heading.replace(/\s+/g, "-")})`,
            );
        });
    }
    lines.push("");
    lines.push("---");
    lines.push("");

    // 1. Summary
    lines.push("## 分析摘要");
    lines.push("");
    const summary =
        scope?.summary || scope?.analysis_summary || scope?.conclusion || null;
    if (summary) {
        lines.push(
            typeof summary === "string" ? summary : renderObject(summary),
        );
    } else {
        lines.push("_暂无摘要信息，请参阅下方详细数据。_");
    }
    lines.push("");

    // 2. Goals
    lines.push("## 分析目标");
    lines.push("");
    const goal = scope?.goal || scope?.target || scope?.analysis_goal || null;
    if (goal) {
        lines.push(typeof goal === "string" ? goal : renderObject(goal));
    } else {
        lines.push("_未记录分析目标。_");
    }
    lines.push("");

    // 3. Key findings
    lines.push("## 关键发现");
    lines.push("");
    const findings =
        scope?.findings || scope?.key_findings || scope?.results || null;
    if (findings) {
        if (Array.isArray(findings)) {
            findings.forEach((f, i) => {
                lines.push(`### 发现 ${i + 1}`);
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
        lines.push("_暂无关键发现记录。_");
    }
    lines.push("");

    // 4. Detailed data - all remaining scope keys
    lines.push("## 详细数据");
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
        lines.push("_暂无详细数据。_");
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
    lines.push("*本报告由 Sherblock 区块链行为分析系统自动生成*");

    return lines.join("\n");
}

export default {
    name: "GENERATE_MARKDOWN_REPORT",

    description:
        "生成结构化的 Markdown 分析报告文件，保存到项目根目录的 report/ 文件夹。报告包含分析摘要、目标、关键发现和详细数据。",

    category: "report",

    params: {
        required: ["title"],
        optional: ["filename", "summary", "sections"],
    },

    whenToUse: [
        "分析完成后需要生成正式报告文档",
        "需要将分析结果导出为 Markdown 文件",
        "需要保存分析报告到本地文件系统",
        "分析结束阶段汇总所有发现并输出报告",
    ],

    async execute(params, context) {
        const { title, filename, summary, sections } = params;

        try {
            // Determine output directory: use workspace reports dir if available,
            // otherwise fall back to {cwd}/report/
            let reportDir;
            if (workspaceManager.isInitialized()) {
                reportDir = workspaceManager.getReportsPath();
            } else {
                reportDir = join(process.cwd(), "report");
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

            // Build extra sections
            const extraSections = Array.isArray(sections) ? sections : [];

            // Build and write markdown
            const markdownContent = buildMarkdownReport(
                title,
                scope,
                extraSections,
            );
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
                        message: `报告已生成并保存到 report/ 目录`,
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
