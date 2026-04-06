/**
 * Adaptive Context Manager for ExecuteAgent
 *
 * Simplified: Only uses LLM-based smart summarization
 * No automatic truncation or field filtering
 */

import { compressionConfig, debugLog, estimateTokens } from "./config.js";
import { LLMSmartSummarizer, SmartSummary } from "./llm-summarizer.js";

/**
 * Compression Tier Enum
 */
export const CompressionTier = {
    NONE: "none",           // No compression needed (context small)
    AGGRESSIVE: "aggressive", // LLM-based summarization (context large)
};

/**
 * Adaptive Context Manager
 * Simplified: only NONE and AGGRESSIVE tiers (LLM summarization)
 */
export class AdaptiveContextManager {
    constructor(callLLM, config = {}) {
        this.callLLM = callLLM;
        this.config = {
            ...compressionConfig,
            ...config,
        };

        // Only one threshold: when to trigger LLM summarization
        this.threshold = config.tokenThreshold || config.threshold || this.config.llmSummarizer.tokenThreshold || 64000;

        // LLM Smart Summarizer
        this.llmSummarizer = callLLM ? new LLMSmartSummarizer(callLLM, {
            tokenThreshold: this.threshold,
            preserveRecentEntries: this.config.llmSummarizer.preserveRecentEntries || 3,
            maxSummaries: this.config.llmSummarizer.maxSummaries || 3,
        }) : null;

        // State
        this.currentTier = CompressionTier.NONE;
        this.stats = {
            totalCalls: 0,
            tierDistribution: {
                [CompressionTier.NONE]: 0,
                [CompressionTier.AGGRESSIVE]: 0,
            },
            originalTokens: 0,
            compressedTokens: 0,
            summarizationCalls: 0,
        };
    }

    /**
     * Main entry: Process context and return compressed version
     */
    async compressPrompt(scope, currentStep, executionHistory, options = {}) {
        this.stats.totalCalls++;

        // Estimate current context size
        const originalSize = this.estimateContextSize(scope, currentStep, executionHistory);
        this.stats.originalTokens += originalSize;

        // Determine compression tier (only NONE or AGGRESSIVE)
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
        if (tier === CompressionTier.NONE) {
            result = await this.applyNoCompression(scope, currentStep, executionHistory);
        } else {
            result = await this.applyAggressiveCompression(scope, currentStep, executionHistory);
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

        // Only trigger LLM summarization when threshold exceeded
        if (estimatedTokens >= this.threshold && this.llmSummarizer) {
            return CompressionTier.AGGRESSIVE;
        }
        return CompressionTier.NONE;
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
     * Aggressive compression - use LLM-based summarization only
     */
    async applyAggressiveCompression(scope, currentStep, executionHistory) {
        if (!this.llmSummarizer) {
            // Fallback to no compression
            return this.applyNoCompression(scope, currentStep, executionHistory);
        }

        // Update current step in summarizer
        this.llmSummarizer.setCurrentStep(currentStep);

        // Add all current history to summarizer
        for (const entry of executionHistory) {
            await this.llmSummarizer.addHistory(entry);
        }

        // Get current context view
        const contextView = this.llmSummarizer.getCurrentContextView();

        // Increment stats
        this.stats.summarizationCalls++;

        // Pass scope unchanged - let LLM handle context
        return {
            scope, // No filtering - pass through
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
            llmSummarizerStats: this.llmSummarizer?.getStats(),
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.currentTier = CompressionTier.NONE;
        this.stats = {
            totalCalls: 0,
            tierDistribution: {
                [CompressionTier.NONE]: 0,
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