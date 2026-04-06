/**
 * Compression Configuration for ExecuteAgent
 *
 * Simplified: Only LLM-based smart summarization remains
 * No automatic truncation or field filtering
 */

/**
 * Compression configuration object
 */
export const compressionConfig = {
    // Enable/disable compression (can be overridden via agent options)
    enabled: true,

    // Debug mode for compression statistics
    debug: process.env.COMPRESSION_DEBUG === "true",

    // LLM Smart Summarizer settings
    llmSummarizer: {
        // Trigger summarization when estimated tokens exceed this
        // Default: 64000 (64k tokens, suitable for most LLM context windows)
        tokenThreshold: 64000,

        // Always keep this many recent entries unsummarized
        preserveRecentEntries: 3,

        // Maximum summaries to keep (oldest get merged)
        maxSummaries: 3,
    },

    // Token estimation (rough approximation: 1 char ≈ 0.25 tokens)
    tokenEstimation: {
        charToTokenRatio: 0.25,
    },
};

/**
 * Get compression config with optional overrides
 */
export function getCompressionConfig(overrides = {}) {
    return {
        ...compressionConfig,
        ...overrides,
        llmSummarizer: {
            ...compressionConfig.llmSummarizer,
            ...(overrides.llmSummarizer || {}),
        },
        tokenEstimation: {
            ...compressionConfig.tokenEstimation,
            ...(overrides.tokenEstimation || {}),
        },
    };
}

/**
 * Estimate token count from string
 */
export function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length * compressionConfig.tokenEstimation.charToTokenRatio);
}

/**
 * Log debug message if debug mode is enabled
 */
export function debugLog(message, data) {
    if (compressionConfig.debug) {
        if (data !== undefined) {
            console.log(`[Compression Debug] ${message}`, data);
        } else {
            console.log(`[Compression Debug] ${message}`);
        }
    }
}

export default compressionConfig;