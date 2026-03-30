/**
 * Adaptive Context Manager for ExecuteAgent
 *
 * Replaces the static CompressionManager with an adaptive system that:
 * - Dynamically adjusts compression strategy based on context size
 * - Uses LLM-based smart summarization when beneficial
 * - Falls back to fast compression for small contexts
 * - Maintains a tiered context structure
 */

import { compressionConfig, debugLog, estimateTokens } from "./config.js";
import { HistoryCompressor } from "./history-compressor.js";
import { ScopeFilter } from "./scope-filter.js";
import { LLMSmartSummarizer, SmartSummary } from "./llm-summarizer.js";

/**
 * Compression Tier Enum
 */
export const CompressionTier = {
    NONE: "none",           // No compression needed
    LIGHT: "light",         // Fast compression only
    MODERATE: "moderate",    // Scope filtering + history truncation
    AGGRESSIVE: "aggressive", // LLM-based summarization
};

/**
 * Adaptive Context Manager
 */
export class AdaptiveContextManager {
    constructor(callLLM, config = {}) {
        this.callLLM = callLLM;
        this.config = {
            ...compressionConfig,
            ...config,
        };

        // Tier thresholds (estimated tokens)
        this.thresholds = {
            light: config.lightThreshold || 3000,
            moderate: config.moderateThreshold || 6000,
            aggressive: config.aggressiveThreshold || 10000,
        };

        // Sub-components
        this.historyCompressor = new HistoryCompressor(this.config.history);
        this.scopeFilter = new ScopeFilter(this.config.scope);
        this.llmSummarizer = callLLM ? new LLMSmartSummarizer(callLLM, config) : null;

        // State
        this.currentTier = CompressionTier.NONE;
        this.stats = {
            totalCalls: 0,
            tierDistribution: {
                [CompressionTier.NONE]: 0,
                [CompressionTier.LIGHT]: 0,
                [CompressionTier.MODERATE]: 0,
                [CompressionTier.AGGRESSIVE]: 0,
            },
            originalTokens: 0,
            compressedTokens: 0,
            summarizationCalls: 0,
        };

        // Context state
        this.summaries = []; // Accumulated LLM summaries
        this.workingHistory = []; // Recent history not yet summarized
    }

    /**
     * Main entry: Process context and return compressed version
     */
    async compressPrompt(scope, currentStep, executionHistory, options = {}) {
        this.stats.totalCalls++;

        // Estimate current context size
        const originalSize = this.estimateContextSize(scope, currentStep, executionHistory);
        this.stats.originalTokens += originalSize;

        // Determine compression tier
        const tier = this.determineTier(originalSize, options);
        this.currentTier = tier;
        this.stats.tierDistribution[tier]++;

        debugLog("Compression triggered", {
            originalTokens: originalSize,
            tier,
            historyEntries: executionHistory.length,
        });

        // Apply compression based on tier
        let result;
        switch (tier) {
            case CompressionTier.NONE:
                result = await this.applyNoCompression(scope, currentStep, executionHistory);
                break;
            case CompressionTier.LIGHT:
                result = await this.applyLightCompression(scope, currentStep, executionHistory);
                break;
            case CompressionTier.MODERATE:
                result = await this.applyModerateCompression(scope, currentStep, executionHistory);
                break;
            case CompressionTier.AGGRESSIVE:
                result = await this.applyAggressiveCompression(scope, currentStep, executionHistory);
                break;
            default:
                result = await this.applyModerateCompression(scope, currentStep, executionHistory);
        }

        // Update stats
        const compressedSize = this.estimateContextSize(result.scope, result.currentStep, result.history);
        this.stats.compressedTokens += compressedSize;

        debugLog("Compression complete", {
            originalTokens: originalSize,
            compressedTokens: compressedSize,
            savedTokens: originalSize - compressedSize,
            compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(1) + "%",
        });

        return {
            ...result,
            compressionInfo: {
                tier,
                originalTokens: originalSize,
                compressedTokens: compressedSize,
                savedTokens: originalSize - compressedSize,
            },
        };
    }

    /**
     * Determine compression tier based on context size
     */
    determineTier(estimatedTokens, options = {}) {
        // Force tier if specified
        if (options.forceTier) {
            return options.forceTier;
        }

        // Check thresholds
        if (estimatedTokens < this.thresholds.light) {
            return CompressionTier.NONE;
        } else if (estimatedTokens < this.thresholds.moderate) {
            return CompressionTier.LIGHT;
        } else if (estimatedTokens < this.thresholds.aggressive) {
            return CompressionTier.MODERATE;
        } else {
            // Only use aggressive if LLM is available
            return this.llmSummarizer ? CompressionTier.AGGRESSIVE : CompressionTier.MODERATE;
        }
    }

    /**
     * Estimate total context size
     */
    estimateContextSize(scope, currentStep, executionHistory) {
        const scopeStr = JSON.stringify(scope);
        const stepStr = JSON.stringify(currentStep);
        const historyStr = JSON.stringify(executionHistory);

        return estimateTokens(scopeStr + stepStr + historyStr);
    }

    /**
     * No compression - return as-is
     */
    async applyNoCompression(scope, currentStep, executionHistory) {
        return {
            scope,
            currentStep,
            history: executionHistory,
            compressed: false,
        };
    }

    /**
     * Light compression - fast truncation only
     */
    async applyLightCompression(scope, currentStep, executionHistory) {
        // Only truncate very long individual entries
        const truncatedHistory = executionHistory.map((entry) => {
            if (!entry || !entry.content) return entry;

            const contentStr = typeof entry.content === "string"
                ? entry.content
                : JSON.stringify(entry.content);

            if (contentStr.length > 2000) {
                return {
                    ...entry,
                    content: contentStr.substring(0, 2000) + "...[truncated]",
                };
            }
            return entry;
        });

        return {
            scope,
            currentStep,
            history: truncatedHistory,
            compressed: true,
        };
    }

    /**
     * Moderate compression - use existing compression components
     */
    async applyModerateCompression(scope, currentStep, executionHistory) {
        // Use existing components
        const compressedHistory = this.historyCompressor.compress(executionHistory);
        const filteredScope = this.scopeFilter.filter(scope, currentStep);

        return {
            scope: filteredScope,
            currentStep,
            history: compressedHistory,
            compressed: true,
        };
    }

    /**
     * Aggressive compression - use LLM-based summarization
     */
    async applyAggressiveCompression(scope, currentStep, executionHistory) {
        if (!this.llmSummarizer) {
            // Fallback to moderate
            return this.applyModerateCompression(scope, currentStep, executionHistory);
        }

        // Update current step in summarizer
        this.llmSummarizer.setCurrentStep(currentStep);

        // Add all current history to summarizer
        for (const entry of executionHistory) {
            await this.llmSummarizer.addHistory(entry);
        }

        // Get current context view
        const contextView = this.llmSummarizer.getCurrentContextView();

        // Use filtered scope
        const filteredScope = this.scopeFilter.filter(scope, currentStep);

        // Increment stats
        this.stats.summarizationCalls++;

        return {
            scope: filteredScope,
            currentStep,
            // The history now includes formatted summaries + working history
            history: [{ type: "SMART_SUMMARY", content: contextView.formattedText }],
            compressed: true,
            smartSummary: true,
        };
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentTier: this.currentTier,
            summaryCount: this.summaries.length,
            workingHistorySize: this.workingHistory.length,
            llmSummarizerStats: this.llmSummarizer?.getStats(),
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.summaries = [];
        this.workingHistory = [];
        this.currentTier = CompressionTier.NONE;
        this.stats = {
            totalCalls: 0,
            tierDistribution: {
                [CompressionTier.NONE]: 0,
                [CompressionTier.LIGHT]: 0,
                [CompressionTier.MODERATE]: 0,
                [CompressionTier.AGGRESSIVE]: 0,
            },
            originalTokens: 0,
            compressedTokens: 0,
            summarizationCalls: 0,
        };
        this.llmSummarizer?.reset();
    }
}

export default AdaptiveContextManager;
