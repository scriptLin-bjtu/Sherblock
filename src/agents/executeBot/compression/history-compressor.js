/**
 * History Compressor for ExecuteAgent
 *
 * Compresses execution history using sliding window + semantic summary strategy:
 * - Recent N entries: keep full detail
 * - Older entries: extract key information (skill calls, success/failure counts)
 */

import { compressionConfig, debugLog, estimateTokens } from "./config.js";

/**
 * History Compressor class
 */
export class HistoryCompressor {
    constructor(config = {}) {
        this.config = {
            ...compressionConfig.history,
            ...config,
        };
        this.stats = {
            originalEntries: 0,
            compressedEntries: 0,
            fullEntries: 0,
            summarizedEntries: 0,
            originalTokens: 0,
            compressedTokens: 0,
        };
    }

    /**
     * Compress execution history
     * @param {Array} history - Execution history array
     * @returns {Array} - Compressed history
     */
    compress(history) {
        this.stats = {
            originalEntries: history.length,
            compressedEntries: 0,
            fullEntries: 0,
            summarizedEntries: 0,
            originalTokens: 0,
            compressedTokens: 0,
        };

        if (!history || history.length === 0) {
            return [];
        }

        // Calculate original tokens
        const originalStr = this.formatFullHistory(history);
        this.stats.originalTokens = estimateTokens(originalStr);

        // If history is small enough, keep everything
        if (history.length <= this.config.fullWindowEntries) {
            this.stats.compressedEntries = history.length;
            this.stats.fullEntries = history.length;
            this.stats.compressedTokens = estimateTokens(originalStr);
            debugLog("History small enough to keep full", {
                entries: history.length,
                tokens: this.stats.compressedTokens,
            });
            return history;
        }

        // Split history: recent full entries + older summarized entries
        const fullEntries = history.slice(-this.config.fullWindowEntries);
        const olderEntries = history.slice(
            0,
            history.length - this.config.fullWindowEntries
        );

        // Limit total entries
        const maxOlderEntries = Math.max(
            0,
            this.config.maxEntries - this.config.fullWindowEntries
        );
        const limitedOlderEntries = olderEntries.slice(-maxOlderEntries);

        // Summarize older entries
        let summarizedEntries = limitedOlderEntries;
        if (this.config.useSemanticSummary) {
            summarizedEntries = this.generateSummary(limitedOlderEntries);
        }

        // Combine and format
        const compressed = [
            ...summarizedEntries,
            ...fullEntries,
        ];

        this.stats.compressedEntries = compressed.length;
        this.stats.fullEntries = fullEntries.length;
        this.stats.summarizedEntries = summarizedEntries.length;

        const compressedStr = this.formatCompressedHistory(compressed);
        this.stats.compressedTokens = estimateTokens(compressedStr);

        debugLog("History compressed", {
            original: this.stats.originalEntries,
            compressed: this.stats.compressedEntries,
            fullEntries: this.stats.fullEntries,
            summarizedEntries: this.stats.summarizedEntries,
            originalTokens: this.stats.originalTokens,
            compressedTokens: this.stats.compressedTokens,
            savedTokens: this.stats.originalTokens - this.stats.compressedTokens,
            savedPercent: this.stats.originalTokens > 0
                ? Math.round(
                    ((this.stats.originalTokens - this.stats.compressedTokens) /
                        this.stats.originalTokens) * 100
                )
                : 0,
        });

        return compressed;
    }

    /**
     * Generate semantic summary for older history entries
     * @param {Array} entries - Older entries to summarize
     * @returns {Array} - Summarized entries
     */
    generateSummary(entries) {
        if (!entries || entries.length === 0) {
            return [];
        }

        // Track statistics across entries
        const stats = {
            actionCount: 0,
            observationCount: 0,
            successfulSkills: new Map(), // skillName -> count
            failedSkills: new Map(),
            skillCallCounts: new Map(), // skillName -> total calls
        };

        // Analyze entries
        for (const entry of entries) {
            if (entry.type === "ACTION") {
                stats.actionCount++;
                if (entry.content?.action_type === "USE_SKILL") {
                    const skillName = entry.content?.skill_name || "unknown";
                    stats.skillCallCounts.set(
                        skillName,
                        (stats.skillCallCounts.get(skillName) || 0) + 1
                    );
                } else if (entry.content?.action_type === "UPDATE_SCOPE") {
                    // Track scope updates
                    const keys = Object.keys(entry.content?.updates || {});
                    keys.forEach(key => {
                        stats.skillCallCounts.set(
                            `update:${key}`,
                            (stats.skillCallCounts.get(`update:${key}`) || 0) + 1
                        );
                    });
                }
            } else if (entry.type === "OBSERVATION") {
                stats.observationCount++;
                if (entry.content?.success === true && entry.content?.skill) {
                    const skillName = entry.content.skill;
                    stats.successfulSkills.set(
                        skillName,
                        (stats.successfulSkills.get(skillName) || 0) + 1
                    );
                } else if (entry.content?.success === false) {
                    const skillName = entry.content?.skill || "unknown";
                    stats.failedSkills.set(
                        skillName,
                        (stats.failedSkills.get(skillName) || 0) + 1
                    );
                }
            }
        }

        // Generate summary entries
        const summaryEntries = [];

        // Add skill summary
        const skillCalls = Array.from(stats.skillCallCounts.entries());
        if (skillCalls.length > 0) {
            const skillSummary = skillCalls
                .map(([name, count]) => `${name}(${count})`)
                .join(", ");

            summaryEntries.push({
                type: "SUMMARY",
                content: `[Summary of ${entries.length} earlier actions] Skills called: ${skillSummary}`,
                isMeta: true,
            });
        }

        // Add success/failure summary
        const successes = Array.from(stats.successfulSkills.entries());
        const failures = Array.from(stats.failedSkills.entries());

        if (successes.length > 0 || failures.length > 0) {
            const parts = [];
            if (successes.length > 0) {
                parts.push(
                    successes
                        .map(([name, count]) => `${name}:${count}`)
                        .join(", ")
                );
            }
            if (failures.length > 0) {
                parts.push(
                    failures.map(([name, count]) => `${name} failed`).join(", ")
                );
            }

            summaryEntries.push({
                type: "SUMMARY",
                content: `[Summary] Results: ${parts.join("; ")}`,
                isMeta: true,
            });
        }

        return summaryEntries;
    }

    /**
     * Format full history entries to string
     * @param {Array} entries - History entries
     * @returns {string} - Formatted string
     */
    formatFullHistory(entries) {
        if (!entries || entries.length === 0) {
            return "(no previous actions)";
        }

        return entries
            .map((h, i) => {
                // Defensive check for invalid entries
                if (!h) {
                    return `${i + 1}. [UNKNOWN] Invalid entry`;
                }

                const type = h.type || "UNKNOWN";
                let contentStr = "";

                try {
                    if (typeof h.content === "string") {
                        contentStr = h.content;
                    } else if (h.content !== null && h.content !== undefined) {
                        contentStr = JSON.stringify(h.content, null, 2);
                    } else {
                        contentStr = "No content";
                    }

                    // Truncate if too long
                    if (contentStr.length > this.config.maxContentLength) {
                        contentStr =
                            contentStr.substring(0, this.config.maxContentLength) +
                            `...[truncated, total ${contentStr.length} chars]`;
                    }
                } catch (error) {
                    // 详细错误定位信息
                    console.error("[ERROR] HistoryCompressor.formatFullHistory failed at index", i, {
                        entryType: type,
                        contentType: typeof h.content,
                        error: error.message,
                        stack: error.stack,
                    });
                    contentStr = `[Error formatting: ${error.message}]`;
                }

                return `${i + 1}. [${type}] ${contentStr}`;
            })
            .join("\n\n");
    }

    /**
     * Format compressed history entries to string
     * @param {Array} entries - Compressed history entries
     * @returns {string} - Formatted string
     */
    formatCompressedHistory(entries) {
        if (!entries || entries.length === 0) {
            return "(no previous actions)";
        }

        return entries
            .map((h, i) => {
                // Meta entries (summaries) don't need numbering
                if (h.isMeta) {
                    return h.content || "";
                }

                const type = h.type || "UNKNOWN";
                let contentStr = "";

                try {
                    if (typeof h.content === "string") {
                        contentStr = h.content;
                    } else if (h.content !== null && h.content !== undefined) {
                        contentStr = JSON.stringify(h.content, null, 2);
                    } else {
                        contentStr = "No content";
                    }

                    // Truncate if too long
                    if (contentStr.length > this.config.maxContentLength) {
                        contentStr =
                            contentStr.substring(0, this.config.maxContentLength) +
                            `...[truncated, total ${contentStr.length} chars]`;
                    }
                } catch (error) {
                    // 详细错误定位信息
                    console.error("[ERROR] HistoryCompressor.formatCompressedHistory failed at index", i, {
                        entryType: type,
                        contentType: typeof h.content,
                        error: error.message,
                        stack: error.stack,
                    });
                    contentStr = `[Error formatting: ${error.message}]`;
                }

                return `${i + 1}. [${type}] ${contentStr}`;
            })
            .join("\n\n");
    }

    /**
     * Smart truncate JSON structure
     * @param {any} obj - Object to truncate
     * @param {Object} options - Truncation options
     * @returns {any} - Truncated object
     */
    smartTruncate(obj, options = {}) {
        const opts = {
            maxStringLength: options.maxStringLength ||
                compressionConfig.truncation.maxStringLength,
            maxArrayLength: options.maxArrayLength || this.config.maxArrayLength,
            maxObjectKeys: options.maxObjectKeys || this.config.maxObjectKeys,
            maxDepth: options.maxDepth || compressionConfig.truncation.maxDepth,
            currentDepth: options.currentDepth || 0,
            showCount: options.showCount !== undefined
                ? options.showCount
                : compressionConfig.truncation.showCount,
            truncationMarker: options.truncationMarker ||
                compressionConfig.truncation.truncationMarker,
        };

        // Check depth limit
        if (opts.currentDepth >= opts.maxDepth) {
            if (typeof obj === "string") {
                return this.truncateString(obj, opts.maxStringLength, opts.truncationMarker);
            }
            return obj;
        }

        // Handle null/undefined
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle primitives
        if (typeof obj !== "object") {
            if (typeof obj === "string") {
                return this.truncateString(obj, opts.maxStringLength, opts.truncationMarker);
            }
            return obj;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            if (obj.length <= opts.maxArrayLength) {
                return obj.map(item =>
                    this.smartTruncate(item, { ...opts, currentDepth: opts.currentDepth + 1 })
                );
            }

            // Return array summary
            const sample = obj.slice(0, Math.min(3, opts.maxArrayLength));
            const truncated = sample.map(item =>
                this.smartTruncate(item, { ...opts, currentDepth: opts.currentDepth + 1 })
            );

            if (opts.showCount) {
                truncated.push(`[...${obj.length - sample.length} more items]`);
            }

            return truncated;
        }

        // Handle objects
        const keys = Object.keys(obj);
        if (keys.length <= opts.maxObjectKeys) {
            const result = {};
            for (const key of keys) {
                result[key] = this.smartTruncate(obj[key], {
                    ...opts,
                    currentDepth: opts.currentDepth + 1,
                });
            }
            return result;
        }

        // Return object summary
        const result = {};
        const sampleKeys = keys.slice(0, Math.min(5, opts.maxObjectKeys));
        for (const key of sampleKeys) {
            result[key] = this.smartTruncate(obj[key], {
                ...opts,
                currentDepth: opts.currentDepth + 1,
            });
        }

        if (opts.showCount) {
            result[`...${keys.length - sampleKeys.length} more keys`] = true;
        }

        return result;
    }

    /**
     * Truncate string to max length
     */
    truncateString(str, maxLength, marker) {
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + marker;
    }

    /**
     * Get compression statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            originalEntries: 0,
            compressedEntries: 0,
            fullEntries: 0,
            summarizedEntries: 0,
            originalTokens: 0,
            compressedTokens: 0,
        };
    }
}

export default HistoryCompressor;
