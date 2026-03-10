/**
 * Compression Manager for ExecuteAgent
 *
 * Coordinates all compression operations:
 * - History compression (via HistoryCompressor)
 * - Scope filtering (via ScopeFilter)
 * - Token estimation
 * - Statistics tracking
 */

import { getCompressionConfig, debugLog, estimateTokens } from "./config.js";
import { HistoryCompressor } from "./history-compressor.js";
import { ScopeFilter } from "./scope-filter.js";

/**
 * Compression Manager class
 */
export class CompressionManager {
    constructor(config = {}) {
        this.config = getCompressionConfig(config);
        this.enabled = this.config.enabled;

        // Initialize compressors
        this.historyCompressor = new HistoryCompressor(this.config.history);
        this.scopeFilter = new ScopeFilter(this.config.scope);

        // Statistics
        this.stats = {
            totalCalls: 0,
            totalOriginalTokens: 0,
            totalCompressedTokens: 0,
            historyStats: {},
            scopeStats: {},
            currentStepStats: {},
        };
    }

    /**
     * Compress all prompt components
     * @param {Object} scope - Analysis scope
     * @param {Object} currentStep - Current step
     * @param {Array} executionHistory - Execution history
     * @returns {Object} - Compressed data { scope, currentStep, history }
     */
    compressPrompt(scope, currentStep, executionHistory) {
        if (!this.enabled) {
            return {
                scope,
                currentStep,
                history: executionHistory,
                compressed: false,
            };
        }

        this.stats.totalCalls++;

        // Compress history
        const compressedHistory = this.historyCompressor.compress(executionHistory);

        // Filter scope
        const filteredScope = this.scopeFilter.filter(scope, currentStep);

        // Compress current step (usually small, but truncate large strings)
        const compressedStep = this.compressStep(currentStep);

        // Calculate total token savings
        const historyStats = this.historyCompressor.getStats();
        const scopeStats = this.scopeFilter.getStats();

        const originalTokens = historyStats.originalTokens + scopeStats.originalTokens;
        const compressedTokens = historyStats.compressedTokens + scopeStats.compressedTokens;

        this.stats.totalOriginalTokens += originalTokens;
        this.stats.totalCompressedTokens += compressedTokens;
        this.stats.historyStats = historyStats;
        this.stats.scopeStats = scopeStats;

        // Calculate step stats with error handling
        let originalSize = 0;
        let compressedSize = 0;
        try {
            originalSize = JSON.stringify(currentStep).length;
        } catch (error) {
            console.error("[ERROR] CompressionManager: JSON.stringify(currentStep) failed:", {
                error: error.message,
                stack: error.stack,
            });
            originalSize = 0;
        }
        try {
            compressedSize = JSON.stringify(compressedStep).length;
        } catch (error) {
            console.error("[ERROR] CompressionManager: JSON.stringify(compressedStep) failed:", {
                error: error.message,
                stack: error.stack,
            });
            compressedSize = 0;
        }

        this.stats.currentStepStats = {
            originalSize,
            compressedSize,
        };

        debugLog("Compression complete", {
            originalTokens,
            compressedTokens,
            savedTokens: originalTokens - compressedTokens,
            savedPercent: originalTokens > 0
                ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
                : 0,
        });

        // Ensure returned values are valid
        return {
            scope: filteredScope || {},
            currentStep: compressedStep || {},
            history: Array.isArray(compressedHistory) ? compressedHistory : [],
            compressed: true,
        };
    }

    /**
     * Compress current step (truncate large strings, but keep structure)
     * @param {Object} step - Step to compress
     * @returns {Object} - Compressed step
     */
    compressStep(step) {
        if (!step) {
            return step;
        }

        const maxStringLength = this.config.truncation.maxStringLength;

        return this.truncateObject(step, maxStringLength);
    }

    /**
     * Recursively truncate large strings in an object
     * @param {any} obj - Object to process
     * @param {number} maxStringLength - Max string length
     * @param {number} depth - Current depth
     * @returns {any} - Processed object
     */
    truncateObject(obj, maxStringLength, depth = 0) {
        if (depth > 5) {
            return obj;
        }

        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj !== "object") {
            if (typeof obj === "string" && obj.length > maxStringLength) {
                return obj.substring(0, maxStringLength) + "...[truncated]";
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.truncateObject(item, maxStringLength, depth + 1));
        }

        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = this.truncateObject(obj[key], maxStringLength, depth + 1);
        }

        return result;
    }

    /**
     * Get compression statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            enabled: this.enabled,
            totalCalls: this.stats.totalCalls,
            totalOriginalTokens: this.stats.totalOriginalTokens,
            totalCompressedTokens: this.stats.totalCompressedTokens,
            totalSavedTokens: this.stats.totalOriginalTokens - this.stats.totalCompressedTokens,
            savedPercent: this.stats.totalOriginalTokens > 0
                ? Math.round(
                    ((this.stats.totalOriginalTokens - this.stats.totalCompressedTokens) /
                        this.stats.totalOriginalTokens) * 100
                )
                : 0,
            history: { ...this.stats.historyStats },
            scope: { ...this.stats.scopeStats },
            currentStep: { ...this.stats.currentStepStats },
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalCalls: 0,
            totalOriginalTokens: 0,
            totalCompressedTokens: 0,
            historyStats: {},
            scopeStats: {},
            currentStepStats: {},
        };
        this.historyCompressor.resetStats();
        this.scopeFilter.resetStats();
    }

    /**
     * Estimate token count for a prompt
     * @param {string} text - Text to estimate
     * @param {boolean} isSystemPrompt - Whether this is a system prompt (may be cached)
     * @returns {number} - Estimated token count
     */
    estimateSize(text, isSystemPrompt = false) {
        const baseTokens = estimateTokens(text);

        if (isSystemPrompt) {
            // System prompts may be cached by LLM providers
            return Math.ceil(baseTokens * this.config.tokenEstimation.systemPromptMultiplier);
        }

        return baseTokens;
    }

    /**
     * Enable or disable compression
     * @param {boolean} enabled - Whether to enable compression
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Update configuration
     * @param {Object} config - New config to merge
     */
    updateConfig(config) {
        this.config = getCompressionConfig({ ...this.config, ...config });
        this.historyCompressor = new HistoryCompressor(this.config.history);
        this.scopeFilter = new ScopeFilter(this.config.scope);
    }
}

export default CompressionManager;
