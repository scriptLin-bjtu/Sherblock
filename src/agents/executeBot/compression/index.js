/**
 * Context Compression System for ExecuteAgent
 *
 * Simplified: Only LLM-based smart summarization remains
 * No automatic truncation or field filtering
 */

// Main compression manager
export { CompressionManager } from "./manager.js";

// LLM-based smart summarization
export { LLMSmartSummarizer, SmartSummary } from "./llm-summarizer.js";

// Configuration
export { compressionConfig, getCompressionConfig, estimateTokens, debugLog } from "./config.js";

// Adaptive compression (used by agent-v2.js, kept for compatibility)
export { AdaptiveContextManager, CompressionTier } from "./adaptive-manager.js";

// Default export
export { CompressionManager as default } from "./manager.js";