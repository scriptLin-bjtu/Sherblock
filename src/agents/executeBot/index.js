/**
 * ExecuteAgent Module Exports
 *
 * Exports both V1 (legacy) and V2 (adaptive) implementations.
 * V2 is recommended for new code and long-running tasks.
 */

// V1 (Legacy) - Original implementation with static compression
export { ExecuteAgent } from "./agent.js";

// V2 (Recommended) - Adaptive context management with LLM-based summarization
export { ExecuteAgentV2 } from "./agent-v2.js";

// Context compression system components
export {
    AdaptiveContextManager,
    CompressionTier,
    LLMSmartSummarizer,
    SmartSummary,
    HistoryCompressor,
    ScopeFilter,
    compressionConfig,
    getCompressionConfig,
    estimateTokens,
} from "./compression/index.js";

// Prompt generators
export { prompt, formatObservation } from "./prompt.js";
export { getSystemPrompt, clearSystemPromptCache } from "./prompt-system.js";
export { generateUserPrompt, generateInitialObservation } from "./prompt-user.js";

// Default export is V2 (recommended)
export { ExecuteAgentV2 as default } from "./agent-v2.js";
