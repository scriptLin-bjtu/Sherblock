/**
 * Skill Registry and Loader
 */

import { readdir } from "fs/promises";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { SUPPORTED_CHAINS } from "./lib/config.js";

export class SkillLoader {
    constructor() {
        this.cache = new Map();
        this.discoveryCache = null;
    }

    async discoverSkills(basePath) {
        if (this.discoveryCache) return this.discoveryCache;

        const skills = [];
        const categories = [
            "account",
            "contract",
            "token",
            "transaction",
            "proxy",
            "logs",
            "stats",
            "gas",
            "block",
            "nametag",
            "report",
            "chart",
        ];

        for (const category of categories) {
            const categoryPath = join(basePath, category);
            try {
                const entries = await readdir(categoryPath, {
                    withFileTypes: true,
                });
                for (const entry of entries) {
                    if (
                        entry.isDirectory() &&
                        !entry.name.startsWith("_") &&
                        entry.name !== "templates" &&
                        entry.name !== "lib"
                    ) {
                        // 过滤 templates 和 lib 目录
                        skills.push({
                            id: `${category}/${entry.name}`,
                            path: join(categoryPath, entry.name),
                            category,
                            folderName: entry.name,
                        });
                    }
                }
            } catch {
                // Category doesn't exist, skip
            }
        }

        this.discoveryCache = skills;
        return skills;
    }

    async loadSkill(skillPath, basePath) {
        if (this.cache.has(skillPath)) return this.cache.get(skillPath);

        const indexPath = join(skillPath, "index.js");
        // Convert to file:// URL for Windows compatibility
        const absolutePath = resolve(indexPath);
        const normalizedPath = absolutePath.replace(/\\/g, "/");
        const fileUrl = `file:///${normalizedPath}`;
        const module = await import(fileUrl);
        const skill = module.default || module;

        this.validateSkill(skill, skillPath);
        this.cache.set(skillPath, skill);

        return skill;
    }

    validateSkill(skill, path) {
        const required = [
            "name",
            "description",
            "category",
            "params",
            "execute",
        ];
        const missing = required.filter((f) => !(f in skill));
        if (missing.length > 0) {
            throw new Error(`Skill at ${path} missing: ${missing.join(", ")}`);
        }
    }

    clearCache(skillPath) {
        if (skillPath) this.cache.delete(skillPath);
        else {
            this.cache.clear();
            this.discoveryCache = null;
        }
    }
}

export class SkillRegistry {
    constructor() {
        this.loader = new SkillLoader();
        this.skills = new Map();
        this.initialized = false;
    }

    async initialize(basePath = __dirname) {
        if (this.initialized) return;

        // Convert to absolute path for Windows compatibility
        const absoluteBasePath = resolve(basePath);
        const discovered = await this.loader.discoverSkills(absoluteBasePath);

        for (const { path, category } of discovered) {
            try {
                const skill = await this.loader.loadSkill(path, basePath);
                this.skills.set(skill.name, {
                    name: skill.name,
                    description: skill.description,
                    category: skill.category,
                    params: skill.params,
                    whenToUse: skill.whenToUse || [],
                    path,
                    skill,
                });
            } catch (error) {
                console.error(
                    `[SkillRegistry] Failed to load skill at ${path}:`,
                    error.message,
                );
            }
        }

        this.initialized = true;
        console.log(
            `[SkillRegistry] Initialized with ${this.skills.size} skills`,
        );
    }

    /**
     * Resolve skill name - exact match only (no aliases)
     */
    resolveSkillName(name) {
        // Only exact match is supported
        if (this.skills.has(name)) {
            return name;
        }
        return null;
    }

    getSkill(name) {
        const resolvedName = this.resolveSkillName(name);
        if (!resolvedName) {
            return null;
        }
        return this.skills.get(resolvedName) || null;
    }

    hasSkill(name) {
        return this.resolveSkillName(name) !== null;
    }

    listSkills() {
        return Array.from(this.skills.values()).map(
            ({ name, description, category }) => ({
                name,
                description,
                category,
            }),
        );
    }

    /**
     * Get all skill names as an array
     */
    getAllSkillNames() {
        return Array.from(this.skills.keys());
    }

    getSkillsByCategory(category) {
        return Array.from(this.skills.values())
            .filter((s) => s.category === category)
            .map(({ name, description, category }) => ({
                name,
                description,
                category,
            }));
    }

    validateParameters(name, params) {
        const resolvedName = this.resolveSkillName(name);
        if (!resolvedName) {
            return { valid: false, error: `Unknown skill: ${name}` };
        }

        const skill = this.skills.get(resolvedName);
        const required = skill.params.required || [];
        const missing = required.filter((p) => {
            const value = params[p];
            return value === undefined || value === null || value === "";
        });

        if (missing.length > 0) {
            return {
                valid: false,
                missing,
                error: `Missing required parameters: ${missing.join(", ")}`,
            };
        }

        return { valid: true };
    }

    generateDocumentation() {
        let doc = "## Available Blockchain Analysis Skills\n\n";

        const byCategory = new Map();
        for (const skill of this.skills.values()) {
            if (!byCategory.has(skill.category)) {
                byCategory.set(skill.category, []);
            }
            byCategory.get(skill.category).push(skill);
        }

        for (const [category, skills] of byCategory) {
            doc += `### ${category.toUpperCase()}\n\n`;
            for (const skill of skills) {
                doc += `#### ${skill.name}\n`;
                doc += `- **Description**: ${skill.description}\n`;
                doc += `- **Required params**: ${
                    skill.params.required.join(", ") || "none"
                }\n`;
                doc += `- **Optional params**: ${
                    skill.params.optional.join(", ") || "none"
                }\n`;
                if (skill.whenToUse?.length > 0) {
                    doc += `- **When to use**: ${skill.whenToUse.join("; ")}\n`;
                }

                // Add examples if available
                if (skill.examples && skill.examples.length > 0) {
                    doc += `- **Example usage**:\n`;
                    const example = skill.examples[0];
                    if (example.description) {
                        doc += `  * ${example.description}\n`;
                    }
                    if (example.params) {
                        doc += `  \`\`\`json\n  ${JSON.stringify(example.params, null, 2).split('\n').join('\n  ')}\n  \`\`\`\n`;
                    }
                }

                doc += "\n";
            }
        }

        return doc;
    }

    getStats() {
        const categories = new Set();
        for (const skill of this.skills.values()) {
            categories.add(skill.category);
        }

        return {
            totalSkills: this.skills.size,
            categories: categories.size,
            skillNames: Array.from(this.skills.keys()),
        };
    }

    /**
     * Generate a high-level capability summary for planning purposes
     * Focuses on what data can be obtained, not technical implementation
     */
    generateCapabilitySummary() {
        let summary = "# Available Analysis Capabilities\n\n";
        summary += "The following data can be queried during execution:\n\n";

        const categoryDescriptions = {
            account:
                "## Account Analysis\n- Query native ETH balance for any address\n- Get transaction history (normal and internal transactions)\n- Identify funding sources and related addresses\n- Get transaction count (nonce) for an address",
            contract:
                "## Contract Analysis\n- Retrieve contract ABI and source code\n- Identify contract creator address\n- Read contract code and storage",
            transaction:
                "## Transaction Analysis\n- Get transaction details and receipt\n- Query transaction status and internal transactions triggered by a transaction\n- Decode contract call data (method name and parameters) using ABI",
            token: "## Token Analysis\n- Query token information (name, symbol, total supply)\n- Get ERC20/ERC721/ERC1155 transfer events\n- Query token balances for specific addresses\n- Get top token holders for a contract",
            proxy: "## Blockchain RPC\n- Get current block number\n- Get block information by number or timestamp\n- Get transaction details and receipt by hash\n- Read contract code via eth_call\n- Query gas price",
            logs: "## Event Logs\n- Query event logs by address, topics, and block range",
            stats: "## Network Statistics\n- Get ETH price and total supply\n- Query block rewards\n- Get token supply information",
            gas: "## Gas Analysis\n- Query estimated gas prices and gas costs",
            block: "## Block Analysis\n- Get block information by timestamp",
            nametag: "## Address Metadata\n- Get address tags and labels",
            report: "## Report Generation\n- Generate structured markdown analysis reports saved to the report/ directory\n- Summarize all findings and scope data into a formatted document",
            chart: "## Chart Generation\n- Create line charts for trend visualization (token prices, transaction volumes)\n- Create bar charts for comparison analysis (address metrics, token balances)\n- Create pie charts for proportional data (portfolio distribution, fund flow ratios)\n- Create scatter plots for correlation analysis (transaction amount vs gas fees)\n- Create radar charts for multi-dimensional profiling (address activity, risk assessment)",
            basic: "## Basic Operations\n- Query basic blockchain data",
        };

        for (const [category, description] of Object.entries(
            categoryDescriptions,
        )) {
            const hasSkills = Array.from(this.skills.values()).some(
                (s) => s.category === category,
            );
            if (hasSkills) {
                summary += description + "\n\n";
            }
        }

        return summary;
    }
}

export const skillRegistry = new SkillRegistry();
