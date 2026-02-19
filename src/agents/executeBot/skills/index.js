/**
 * Skill Registry and Loader
 */

import { readdir } from "fs/promises";
import { join, dirname } from "path";
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
        const categories = ['account', 'contract', 'token', 'transaction', 'proxy', 'logs', 'stats'];

        for (const category of categories) {
            const categoryPath = join(basePath, category);
            try {
                const entries = await readdir(categoryPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
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

    async loadSkill(skillPath) {
        if (this.cache.has(skillPath)) return this.cache.get(skillPath);

        const indexPath = join(skillPath, 'index.js');
        // Convert to file:// URL for Windows compatibility
        const fileUrl = new URL(`file://${indexPath.replace(/\\/g, '/')}`).href;
        const module = await import(fileUrl);
        const skill = module.default || module;

        this.validateSkill(skill, skillPath);
        this.cache.set(skillPath, skill);

        return skill;
    }

    validateSkill(skill, path) {
        const required = ['name', 'description', 'category', 'params', 'execute'];
        const missing = required.filter(f => !(f in skill));
        if (missing.length > 0) {
            throw new Error(`Skill at ${path} missing: ${missing.join(', ')}`);
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

        const discovered = await this.loader.discoverSkills(basePath);

        for (const { path, category } of discovered) {
            try {
                const skill = await this.loader.loadSkill(path);
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
                console.error(`[SkillRegistry] Failed to load skill at ${path}:`, error.message);
            }
        }

        this.initialized = true;
        console.log(`[SkillRegistry] Initialized with ${this.skills.size} skills`);
    }

    getSkill(name) {
        return this.skills.get(name) || null;
    }

    hasSkill(name) {
        return this.skills.has(name);
    }

    listSkills() {
        return Array.from(this.skills.values()).map(({ name, description, category }) => ({
            name,
            description,
            category,
        }));
    }

    getSkillsByCategory(category) {
        return Array.from(this.skills.values())
            .filter(s => s.category === category)
            .map(({ name, description, category }) => ({ name, description, category }));
    }

    validateParameters(name, params) {
        const skill = this.skills.get(name);
        if (!skill) {
            return { valid: false, error: `Unknown skill: ${name}` };
        }

        const required = skill.params.required || [];
        const missing = required.filter(p => {
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
                doc += `- **Required params**: ${skill.params.required.join(", ") || "none"}\n`;
                doc += `- **Optional params**: ${skill.params.optional.join(", ") || "none"}\n`;
                if (skill.whenToUse?.length > 0) {
                    doc += `- **When to use**: ${skill.whenToUse.join("; ")}\n`;
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
}

export const skillRegistry = new SkillRegistry();
