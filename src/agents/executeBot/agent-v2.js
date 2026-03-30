/**
 * ExecuteAgent V2 - Enhanced with Adaptive Context Management
 *
 * Key improvements:
 * 1. LLM-based smart summarization instead of simple truncation
 * 2. Tiered compression strategy (None → Light → Moderate → Aggressive)
 * 3. Structured context layers for better information organization
 * 4. Intelligent trigger thresholds based on actual token estimates
 * 5. Preserves critical decision information across long executions
 */

import { getSystemPrompt } from "./prompt-system.js";
import { generateUserPrompt, generateInitialObservation } from "./prompt-user.js";
import {
    AdaptiveContextManager,
    CompressionTier,
    SmartSummary,
} from "./compression/index.js";
import { SkillRegistry, SUPPORTED_CHAINS } from "./skills/index.js";

/**
 * ExecuteAgent V2 Class
 */
export class ExecuteAgentV2 {
    constructor(callLLM, scopeManager, options = {}) {
        this.callLLM = callLLM;
        this.scopeManager = scopeManager;
        this.options = options;

        // Core state
        this.scope = null;
        this.currentStep = null;
        this.executionHistory = [];
        this.maxIterations = 20;
        this.retryCount = 0;
        this.maxRetries = 3;

        // Components
        this.skillRegistry = new SkillRegistry();
        this.initialized = false;

        // Adaptive context manager (replaces old compression manager)
        this.contextManager = new AdaptiveContextManager(callLLM, {
            // Use options to configure thresholds
            lightThreshold: options.lightThreshold || 3000,
            moderateThreshold: options.moderateThreshold || 6000,
            aggressiveThreshold: options.aggressiveThreshold || 10000,
            // Summarization trigger config
            historyEntryThreshold: options.historyEntryThreshold || 8,
            tokenThreshold: options.tokenThreshold || 6000,
            preserveRecentEntries: options.preserveRecentEntries || 3,
            maxSummaries: options.maxSummaries || 3,
            // Inherit other config
            ...options.compressionConfig,
        });

        // Statistics
        this.stats = {
            totalIterations: 0,
            totalSkillCalls: 0,
            totalScopeUpdates: 0,
            compressionStats: {},
        };
    }

    /**
     * Initialize the agent
     */
    async initialize() {
        if (this.initialized) return;

        await this.skillRegistry.initialize();

        console.log("[ExecuteAgentV2] Initialized with Adaptive Context Management");
        console.log(`[ExecuteAgentV2] Compression thresholds: Light=${this.contextManager.thresholds.light}, Moderate=${this.contextManager.thresholds.moderate}, Aggressive=${this.contextManager.thresholds.aggressive}`);

        this.initialized = true;
    }

    /**
     * Main entry point - execute a single step
     */
    async executeStep(scope, currentStep) {
        this.scope = { ...scope };
        this.currentStep = currentStep;
        this.executionHistory = [];
        this.retryCount = 0;

        // Set current step in context manager for better summarization
        this.contextManager.llmSummarizer?.setCurrentStep(currentStep);

        console.log(`\n[ExecuteAgentV2] Starting step: ${currentStep.goal}`);
        console.log(`[ExecuteAgentV2] Initial scope keys: ${Object.keys(scope).join(", ")}`);

        // Start of ReAct loop with initial observation
        const initialObservation = generateInitialObservation(currentStep);

        return await this.react(initialObservation);
    }

    /**
     * ReAct core loop - Reasoning + Acting
     */
    async react(observation) {
        // Defensive check
        if (!Array.isArray(this.executionHistory)) {
            this.executionHistory = [];
        }

        // Add observation to history
        if (observation !== undefined && observation !== null) {
            this.executionHistory.push({
                type: "OBSERVATION",
                content: observation,
            });
        }

        this.stats.totalIterations++;

        // Check for max iterations
        if (this.executionHistory.length > this.maxIterations * 2) {
            console.log("[ExecuteAgentV2] Max iterations reached");
            return {
                status: "failure",
                reason: "Max iterations exceeded",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Prepare prompts using adaptive context management
        let systemPrompt, userMessageText;

        try {
            // Use adaptive compression
            const compressed = await this.contextManager.compressPrompt(
                this.scope,
                this.currentStep,
                this.executionHistory,
                { currentTier: this.currentTier }
            );

            // Get system prompt (cached)
            systemPrompt = await getSystemPrompt();

            // Generate user prompt with compressed context
            userMessageText = generateUserPrompt(
                compressed.scope,
                compressed.currentStep,
                compressed.history
            );

            // Add latest observation
            if (observation) {
                userMessageText += `\n\n[Latest Observation]\n${observation}`;
            }

            // Add compression info for transparency
            if (compressed.compressionInfo) {
                const info = compressed.compressionInfo;
                userMessageText += `\n\n[Context Info] Tier: ${info.tier}, Original: ${info.originalTokens}t, Compressed: ${info.compressedTokens}t`;
            }

            // Log stats periodically
            if (this.stats.totalIterations % 5 === 0) {
                const stats = this.contextManager.getStats();
                console.log(`[ExecuteAgentV2] Context stats: Tier=${this.currentTier}, Calls=${stats.totalCalls}, Summarizations=${stats.summarizationCalls}`);
            }

        } catch (error) {
            console.error("[ExecuteAgentV2] Context compression failed:", error);
            // Fallback: use minimal context
            systemPrompt = await getSystemPrompt();
            userMessageText = `Error in context preparation. Current observation: ${observation}`;
        }

        // Validate prompts
        if (!systemPrompt || !userMessageText) {
            return {
                status: "failure",
                reason: "Invalid prompt generation",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Call LLM
        const res = await this.callLLM({
            systemPrompt: systemPrompt,
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: [{ type: "text", text: userMessageText }],
            modelProvider: "deepseek",
        });

        console.log("[ExecuteAgentV2] Thought & Action:", JSON.stringify(res, null, 2));

        // Extract and validate action
        const action = res.data || res;

        if (!action || !action.action_type) {
            return {
                status: "failure",
                reason: "Invalid action from LLM",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Record action
        this.executionHistory.push({
            type: "ACTION",
            content: action,
        });

        // Execute action
        return await this.executeAction(action);
    }

    /**
     * Execute action
     */
    async executeAction(action) {
        switch (action.action_type) {
            case "USE_SKILL": {
                const { skill_name, params, chain_id } = action;

                if (!skill_name) {
                    return await this.react("Error: skill_name is required for USE_SKILL action");
                }

                const result = await this.executeSkill(skill_name, params || {}, chain_id);
                this.stats.totalSkillCalls++;

                // Format result for observation
                await new Promise((r) => setTimeout(r, 300));

                const MAX_OBSERVATION_LENGTH = 8000;
                let resultStr;

                try {
                    if (result.content !== null && result.content !== undefined) {
                        resultStr = JSON.stringify(result.content, null, 2);
                    } else {
                        resultStr = "No content returned";
                    }

                    if (resultStr.length > MAX_OBSERVATION_LENGTH) {
                        resultStr = resultStr.substring(0, MAX_OBSERVATION_LENGTH) +
                            `\n...[truncated, total ${resultStr.length} chars]`;
                    }
                } catch (error) {
                    console.error("[ExecuteAgentV2] Failed to format skill result:", error);
                    resultStr = `[Error formatting result: ${error.message}]`;
                }

                return await this.react(`Skill ${skill_name} result:\n${resultStr}`);
            }

            case "UPDATE_SCOPE": {
                if (action.updates) {
                    await this.mergeUpdates(action.updates);
                    this.stats.totalScopeUpdates++;
                    console.log("[ExecuteAgentV2] Scope updated:", JSON.stringify(action.updates, null, 2));
                }

                await new Promise((r) => setTimeout(r, 200));
                return await this.react(
                    `Scope updated. Current scope keys: ${Object.keys(this.scope).join(", ")}`
                );
            }

            case "FINISH": {
                const result = action.result || {};

                console.log(
                    `[ExecuteAgentV2] Step completed with status: ${result.status || "unknown"}`
                );

                // Include compression stats in result
                const compressionStats = this.contextManager.getStats();

                return {
                    status: result.status || "success",
                    summary: result.summary || "Step completed",
                    data: result.data || {},
                    next_step_inputs: result.next_step_inputs || {},
                    scope: this.scope,
                    history: this.executionHistory,
                    stats: {
                        ...this.stats,
                        compression: compressionStats,
                    },
                };
            }

            default: {
                this.retryCount++;
                if (this.retryCount >= this.maxRetries) {
                    return {
                        status: "failure",
                        reason: `Unknown action type: ${action.action_type}`,
                        scope: this.scope,
                        history: this.executionHistory,
                    };
                }

                return await this.react(
                    `Unknown action type "${action.action_type}". Please use USE_SKILL, UPDATE_SCOPE, or FINISH.`
                );
            }
        }
    }

    /**
     * Execute a skill
     */
    async executeSkill(skillName, params, chainId) {
        if (!this.initialized) {
            await this.initialize();
        }

        const skill = this.skillRegistry.getSkill(skillName);
        if (!skill) {
            const availableSkills = this.skillRegistry.getAllSkillNames();
            return {
                type: "OBSERVATION",
                content: {
                    skill: skillName,
                    success: false,
                    error: `Unknown skill: "${skillName}". The skill name does not exist in the available skill list.`,
                    available_skills: availableSkills,
                    message: `Please use a valid skill skillName from the list above. Case-sensitive matching is required.`,
                },
            };
        }

        const validation = this.skillRegistry.validateParameters(skillName, params);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        try {
            console.log(`[ExecuteAgentV2] Calling: ${skillName}`);

            const context = {
                apiKey: this.getApiKey(),
                chainId: chainId || this.getChainId(),
            };

            const result = await skill.skill.execute(params, context);

            await new Promise((r) => setTimeout(r, 300));

            if (result && result.type === "OBSERVATION" && result.content) {
                return result;
            } else if (result && result.content) {
                return {
                    type: "OBSERVATION",
                    content: result.content,
                };
            } else {
                return {
                    type: "OBSERVATION",
                    content: {
                        skill: skillName,
                        success: false,
                        error: "Unexpected result format from skill",
                        result,
                    },
                };
            }
        } catch (error) {
            console.error(`[ExecuteAgentV2] Skill error:`, error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: skillName,
                    success: false,
                    error: error.message,
                },
            };
        }
    }

    /**
     * Merge updates into scope
     */
    async mergeUpdates(updates) {
        console.log("[ExecuteAgentV2] mergeUpdates called with:", JSON.stringify(Object.keys(updates)));

        for (const key of Object.keys(updates)) {
            if (
                this.scope[key] !== undefined &&
                typeof this.scope[key] === "object" &&
                typeof updates[key] === "object" &&
                !Array.isArray(updates[key])
            ) {
                this.scope[key] = { ...this.scope[key], ...updates[key] };
            } else {
                this.scope[key] = updates[key];
            }
        }

        console.log("[ExecuteAgentV2] Updated scope keys:", Object.keys(this.scope));

        // Persist to file
        if (this.scopeManager) {
            console.log("[ExecuteAgentV2] Persisting scope...");
            await this.scopeManager.write(this.scope);
        }
    }

    /**
     * Get API key
     */
    getApiKey() {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
            throw new Error("ETHERSCAN_API_KEY not found in environment variables");
        }
        return apiKey;
    }

    /**
     * Get chain ID
     */
    getChainId() {
        if (!this.scope?.basic_infos?.chain) return "1";

        const chainName = this.scope.basic_infos.chain.toLowerCase();
        return SUPPORTED_CHAINS[chainName] || "1";
    }

    /**
     * Get current scope
     */
    getScope() {
        return this.scope;
    }

    /**
     * Get execution history
     */
    getHistory() {
        return this.executionHistory;
    }

    /**
     * Get compression statistics
     */
    getCompressionStats() {
        return this.contextManager.getStats();
    }

    /**
     * Reset statistics
     */
    resetCompressionStats() {
        this.contextManager.reset();
    }

    /**
     * Enable/disable adaptive compression
     */
    setCompressionEnabled(enabled) {
        // Update thresholds to force tier selection
        if (!enabled) {
            // Set very high thresholds so we stay in NONE tier
            this.contextManager.thresholds = {
                light: Infinity,
                moderate: Infinity,
                aggressive: Infinity,
            };
        } else {
            // Restore original thresholds
            this.contextManager.thresholds = {
                light: this.options.lightThreshold || 3000,
                moderate: this.options.moderateThreshold || 6000,
                aggressive: this.options.aggressiveThreshold || 10000,
            };
        }
        console.log(`[ExecuteAgentV2] Compression ${enabled ? "enabled" : "disabled"}`);
    }
}

export default ExecuteAgentV2;
