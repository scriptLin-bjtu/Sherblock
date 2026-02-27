/**
 * Compression Configuration for ExecuteAgent
 *
 * Defines strategies for:
 * - History compression (sliding window + semantic summary)
 * - Scope filtering (relevant fields only)
 * - Smart truncation for large data structures
 */

/**
 * Compression configuration object
 */
export const compressionConfig = {
    // Enable/disable compression (can be overridden via agent options)
    enabled: true,

    // Debug mode for compression statistics
    debug: process.env.COMPRESSION_DEBUG === "true",

    // History compression settings
    history: {
        // Number of recent entries to keep in full detail
        fullWindowEntries: 5,

        // Maximum character length per history entry (before truncation)
        maxContentLength: 1000,

        // Maximum total history entries to keep (including summarized ones)
        maxEntries: 15,

        // Whether to generate semantic summaries for older entries
        useSemanticSummary: true,

        // Maximum length of summary text per summarized entry
        summaryMaxLength: 200,
    },

    // Scope filtering settings
    scope: {
        // Core fields that are always included (regardless of current step)
        coreFields: [
            "basic_infos",
            "target_address",
            "chain",
        ],

        // Maximum array length before summarizing (keeps count + sample)
        maxArrayLength: 10,

        // Maximum object keys before summarizing
        maxObjectKeys: 20,

        // Maximum string length before truncation
        maxStringLength: 500,

        // Fields to exclude entirely (even if in coreFields)
        excludedFields: [],

        // Fields that should always be summarized (never fully included)
        alwaysSummarizeFields: [],
    },

    // Smart truncation settings
    truncation: {
        // Maximum depth for recursive object traversal
        maxDepth: 5,

        // Maximum total string length for a value
        maxStringLength: 1000,

        // Add truncation marker when content is cut
        truncationMarker: "...[truncated]",

        // Show count when arrays/objects are truncated
        showCount: true,
    },

    // Token estimation (rough approximation: 1 char ≈ 0.25 tokens)
    tokenEstimation: {
        charToTokenRatio: 0.25,

        // System prompt multiplier (LLM may cache system prompts)
        systemPromptMultiplier: 0.1,
    },
};

/**
 * Get compression config with optional overrides
 */
export function getCompressionConfig(overrides = {}) {
    return {
        ...compressionConfig,
        ...overrides,
        history: {
            ...compressionConfig.history,
            ...(overrides.history || {}),
        },
        scope: {
            ...compressionConfig.scope,
            ...(overrides.scope || {}),
        },
        truncation: {
            ...compressionConfig.truncation,
            ...(overrides.truncation || {}),
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
