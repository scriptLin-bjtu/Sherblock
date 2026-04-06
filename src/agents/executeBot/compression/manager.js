/**
 * Compression Manager for ExecuteAgent
 *
 * Simplified: Only uses LLM-based smart summarization
 * No automatic truncation or field filtering
 */

import { getCompressionConfig, debugLog, estimateTokens } from "./config.js";
import { LLMSmartSummarizer } from "./llm-summarizer.js";

/**
 * Compression Manager class
 * Now only coordinates LLM-based smart summarization
 */
export class CompressionManager {
    constructor(callLLM, config = {}) {
        this.callLLM = callLLM;
        this.config = getCompressionConfig(config);
        this.enabled = this.config.enabled;

        // Initialize LLM Smart Summarizer
        this.llmSummarizer = new LLMSmartSummarizer(callLLM, {
            tokenThreshold: this.config.llmSummarizer.tokenThreshold,
            preserveRecentEntries: this.config.llmSummarizer.preserveRecentEntries,
            maxSummaries: this.config.llmSummarizer.maxSummaries,
        });

        // Statistics
        this.stats = {
            totalCalls: 0,
            totalOriginalTokens: 0,
            totalCompressedTokens: 0,
        };
    }

    /**
     * Compress prompt components
     * Now only uses LLM summarization - no truncation, no filtering
     * @param {Object} scope - Analysis scope (passed through unchanged)
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

        // Pass scope and currentStep through unchanged
        // Let LLM handle the context management
        const originalTokens = estimateTokens(JSON.stringify({ scope, currentStep, executionHistory }));
        this.stats.totalOriginalTokens += originalTokens;

        // Use LLM Smart Summarizer for history compression
        const compressedHistory = this.llmSummarizer.getCurrentContextView();

        // Estimate compressed tokens
        const compressedTokens = estimateTokens(JSON.stringify({
            scope,
            currentStep,
            history: compressedHistory.workingHistory
        }));
        this.stats.totalCompressedTokens += compressedTokens;

        debugLog("Compression complete (LLM summarization only)", {
            originalTokens,
            compressedTokens,
            savedTokens: originalTokens - compressedTokens,
        });

        // Return scope and currentStep unchanged, use LLM-compressed history
        return {
            scope, // No filtering - pass through
            currentStep, // No truncation - pass through
            history: compressedHistory, // LLM-compressed
            compressed: true,
        };
    }

    /**
     * Add execution history entry (integrates with LLM summarizer)
     * @param {Object} entry - History entry to add
     */
    async addHistory(entry) {
        if (!this.enabled || !this.llmSummarizer) {
            return entry;
        }
        return await this.llmSummarizer.addHistory(entry);
    }

    /**
     * Set current step context (for better summarization)
     * @param {Object} step - Current step
     */
    setCurrentStep(step) {
        if (this.llmSummarizer) {
            this.llmSummarizer.setCurrentStep(step);
        }
    }

    /**
     * Get compression statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        const llmStats = this.llmSummarizer ? this.llmSummarizer.getStats() : {};
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
            llmSummarizer: llmStats,
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
        };
        if (this.llmSummarizer) {
            this.llmSummarizer.reset();
        }
    }

    /**
     * Estimate token count for a prompt
     * @param {string} text - Text to estimate
     * @returns {number} - Estimated token count
     */
    estimateSize(text) {
        return estimateTokens(text);
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
        this.llmSummarizer = new LLMSmartSummarizer(this.callLLM, {
            tokenThreshold: this.config.llmSummarizer.tokenThreshold,
            preserveRecentEntries: this.config.llmSummarizer.preserveRecentEntries,
            maxSummaries: this.config.llmSummarizer.maxSummaries,
        });
    }
}

export default CompressionManager;