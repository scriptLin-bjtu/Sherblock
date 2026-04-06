import { prompt, formatObservation } from "./prompt.js";
import { getSystemPrompt } from "./prompt-system.js";
import { generateUserPrompt, generateInitialObservation } from "./prompt-user.js";
import { CompressionManager } from "./compression/manager.js";
import { SkillRegistry, SUPPORTED_CHAINS } from "./skills/index.js";

/**
 * ExecuteAgent - Executes individual steps from analysis plan
 * Uses ReAct (Reasoning + Acting) pattern
 */
export class ExecuteAgent {
    constructor(callLLM, scopeManager, options = {}) {
        this.callLLM = callLLM;
        this.scope = null;
        this.currentStep = null;
        this.executionHistory = [];
        this.maxIterations = 20;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.skillRegistry = new SkillRegistry();
        this.initialized = false;
        this.scopeManager = scopeManager;

        // Store options for later use
        this._options = options;

        // Compression configuration
        this.compressionEnabled = options.compressionEnabled !== undefined
            ? options.compressionEnabled
            : true; // Enabled by default
        this.compressionManager = null;

        // Legacy mode: if compression is explicitly disabled, use original behavior
        this.useLegacyPrompt = options.useLegacyPrompt === true;
    }

    async initialize() {
        if (this.initialized) return;
        await this.skillRegistry.initialize();

        // Initialize compression manager if enabled
        if (this.compressionEnabled && !this.useLegacyPrompt) {
            this.compressionManager = new CompressionManager(this.callLLM, {
                enabled: true,
                ...(this._options.compressionConfig || {}),
            });
            console.log("[ExecuteAgent] Compression enabled (LLM summarization only)");
        } else {
            console.log("[ExecuteAgent] Compression disabled (legacy mode)");
        }

        this.initialized = true;
    }

    /**
     * Get Etherscan API key from environment
     */
    getApiKey() {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
            throw new Error(
                "ETHERSCAN_API_KEY not found in environment variables"
            );
        }
        return apiKey;
    }

    /**
     * Get chain ID from scope or default to Ethereum
     */
    getChainId() {
        if (!this.scope?.basic_infos?.chain) return "1";

        const chainName = this.scope.basic_infos.chain.toLowerCase();
        return SUPPORTED_CHAINS[chainName] || "1";
    }

    /**
     * Deep merge updates into scope
     */
    async mergeUpdates(updates) {
        console.log('[ExecuteAgent] mergeUpdates called with:', JSON.stringify(Object.keys(updates)));
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
        console.log('[ExecuteAgent] Updated scope in memory, keys:', Object.keys(this.scope));
        // Write updated scope to file
        if (this.scopeManager) {
            console.log('[ExecuteAgent] Calling scopeManager.write()...');
            await this.scopeManager.write(this.scope);
            console.log('[ExecuteAgent] scopeManager.write() completed');
        } else {
            console.log('[ExecuteAgent] WARNING: scopeManager is not available!');
        }
    }

    /**
     * Execute a blockchain analysis skill via Etherscan API
     */
    async executeSkill(skillName, params, chainId) {
        // Ensure initialized
        if (!this.initialized) {
            await this.initialize();
        }

        // Get skill from registry
        const skill = this.skillRegistry.getSkill(skillName);
        if (!skill) {
            // List available skills to help debug
            const availableSkills = this.skillRegistry.listSkills().slice(0, 20).map(s => s.name).join(", ");
            return {
                type: "OBSERVATION",
                content: {
                    skill: skillName,
                    success: false,
                    error: `Unknown skill: "${skillName}". Available skills include: ${availableSkills}...`,
                    available_skills: this.skillRegistry.listSkills().map(s => s.name),
                },
            };
        }

        // Validate required parameters
        const validation = this.skillRegistry.validateParameters(skillName, params);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        try {
            console.log(`[ExecuteAgent] Calling: ${skillName}`);

            // Execute skill with context
            const context = {
                apiKey: this.getApiKey(),
                chainId: chainId || this.getChainId(),
            };
            const result = await skill.skill.execute(params, context);

            // Add small delay to avoid rate limiting
            await new Promise((r) => setTimeout(r, 300));

            // Ensure result has expected format
            if (result && result.type === "OBSERVATION" && result.content) {
                return result;
            } else if (result && result.content) {
                // Wrap in expected format if needed
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
            console.error(`[ExecuteAgent] Skill error:`, error.message);
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
     * Main entry point - execute a single step
     */
    async executeStep(scope, currentStep) {
        this.scope = { ...scope };
        this.currentStep = currentStep;
        this.executionHistory = [];
        this.retryCount = 0;

        console.log(`\n[ExecuteAgent] Starting step: ${currentStep.goal}`);

        // Start of ReAct loop with initial observation
        const initialObservation = generateInitialObservation(currentStep);

        return await this.react(initialObservation);
    }

    /**
     * ReAct core loop - Reasoning + Acting
     */
    async react(observation) {
        // Defensive check: ensure executionHistory is an array
        if (!Array.isArray(this.executionHistory)) {
            console.warn("[ExecuteAgent] executionHistory is not an array, initializing");
            this.executionHistory = [];
        }

        // Filter out observations with undefined or null content (failed skill lookups)
        if (observation === undefined || observation === null) {
            console.log("[ExecuteAgent] Skipping undefined/null observation");
            // Continue with history as-is
        } else {
            // Add observation to history
            this.executionHistory.push({
                type: "OBSERVATION",
                content: observation,
            });
        }

        // Limit history size to prevent context overflow (keep last 20 entries)
        const MAX_HISTORY_SIZE = 20;
        if (this.executionHistory.length > MAX_HISTORY_SIZE) {
            console.log(`[ExecuteAgent] Truncating history from ${this.executionHistory.length} to ${MAX_HISTORY_SIZE} entries`);
            this.executionHistory = this.executionHistory.slice(-MAX_HISTORY_SIZE);
        }

        // Safety check for max iterations
        if (this.executionHistory.length > this.maxIterations * 2) {
            console.log("[ExecuteAgent] Max iterations reached");
            return {
                status: "failure",
                reason: "Max iterations exceeded",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Prepare prompts based on mode (compressed or legacy)
        let systemPrompt, userMessageText;

        if (this.useLegacyPrompt || !this.compressionManager) {
            // Legacy mode: use original prompt function
            systemPrompt = prompt(this.scope, this.currentStep, this.executionHistory);
            userMessageText = observation;
        } else {
            // Compressed mode: use separate system and user prompts
            try {
                // Compress context
                const compressed = this.compressionManager.compressPrompt(
                    this.scope,
                    this.currentStep,
                    this.executionHistory
                );

                systemPrompt = getSystemPrompt();
                userMessageText = generateUserPrompt(
                    compressed.scope,
                    compressed.currentStep,
                    compressed.history
                );

                // Add observation to the end
                if (observation) {
                    userMessageText += `\n\n[Latest Observation]\n${observation}`;
                }

                // Log compression stats periodically
                if (this.compressionManager.getStats().totalCalls % 3 === 0) {
                    const stats = this.compressionManager.getStats();
                    console.log(`[ExecuteAgent] Compression stats: ${stats.savedPercent}% saved (${stats.totalSavedTokens} tokens)`);
                }
            } catch (error) {
                // Detailed error tracking information
                console.error("[ERROR] ExecuteAgent.react: Compression failed", {
                    error: error.message,
                    stack: error.stack,
                });
                console.warn("[ExecuteAgent] Compression failed, falling back to legacy mode:", error.message);
                this.useLegacyPrompt = true;
                systemPrompt = prompt(this.scope, this.currentStep, this.executionHistory);
                // Ensure observation is valid, otherwise use fallback message
                userMessageText = (typeof observation === 'string') ? observation : "Starting new execution after compression error";
            }
        }

        // Validate systemPrompt before calling LLM
        if (!systemPrompt || typeof systemPrompt !== 'string') {
            console.error("[ExecuteAgent] Invalid systemPrompt:", typeof systemPrompt, "value:", systemPrompt);
            return {
                status: "failure",
                reason: "Invalid system prompt generated",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Validate userMessageText before calling LLM
        if (!userMessageText || typeof userMessageText !== 'string') {
            console.error("[ExecuteAgent] Invalid userMessageText:", typeof userMessageText, "value:", userMessageText);
            return {
                status: "failure",
                reason: "Invalid user message generated",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Call LLM for next action
        const res = await this.callLLM({
            systemPrompt: systemPrompt,
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: [{ type: "text", text: userMessageText }],
            modelProvider: "deepseek",
        });

        console.log(
            "[ExecuteAgent] Thought & Action:",
            JSON.stringify(res, null, 2)
        );

        // Extract parsed action with validation
        const action = res.data || res;

        // Validate action has required fields
        if (!action) {
            console.error("[ExecuteAgent] LLM returned null/undefined action");
            return {
                status: "failure",
                reason: "LLM returned null or undefined action",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        if (!action.action_type) {
            console.error("[ExecuteAgent] Action missing required 'action_type' field:", action);
            return {
                status: "failure",
                reason: "Action missing required 'action_type' field",
                scope: this.scope,
                history: this.executionHistory,
            };
        }

        // Record action in history
        this.executionHistory.push({
            type: "ACTION",
            content: action,
        });

        // Execute action
        return await this.executeAction(action);
    }

    /**
     * Execute action returned by LLM
     */
    async executeAction(action) {
        switch (action.action_type) {
            case "USE_SKILL": {
                // Execute blockchain analysis skill
                const { skill_name, params, chain_id } = action;

                if (!skill_name) {
                    return await this.react(
                        "Error: skill_name is required for USE_SKILL action"
                    );
                }

                const result = await this.executeSkill(
                    skill_name,
                    params || {},
                    chain_id
                );

                // Add small delay to avoid rate limiting
                await new Promise((r) => setTimeout(r, 300));

                // Continue ReAct loop with observation
                // Truncate if too long to prevent context overflow
                const MAX_OBSERVATION_LENGTH = 8000;
                let resultStr;

                try {
                    if (result.content !== null && result.content !== undefined) {
                        resultStr = JSON.stringify(result.content, null, 2);
                    } else {
                        resultStr = "No content returned";
                    }

                    if (resultStr.length > MAX_OBSERVATION_LENGTH) {
                        resultStr =
                            resultStr.substring(0, MAX_OBSERVATION_LENGTH) +
                            `\n...[truncated, total ${resultStr.length} chars]`;
                    }
                } catch (error) {
                    // Detailed error tracking information
                    console.error("[ERROR] ExecuteAgent: Failed to format skill result", {
                        skillName,
                        contentType: typeof result.content,
                        error: error.message,
                        stack: error.stack,
                    });
                    resultStr = `[Error formatting result: ${error.message}]`;
                }

                return await this.react(`Skill ${skill_name} result:\n${resultStr}`);
            }

            case "UPDATE_SCOPE": {
                // Update scope with new findings
                if (action.updates) {
                    await this.mergeUpdates(action.updates);
                    console.log(
                        "[ExecuteAgent] Scope updated:",
                        JSON.stringify(action.updates, null, 2)
                    );
                }

                await new Promise((r) => setTimeout(r, 200));
                return await this.react(
                    `Scope updated. Current scope keys: ${Object.keys(
                        this.scope
                    ).join(", ")}`
                );
            }

            case "FINISH": {
                // Complete this step
                const result = action.result || {};

                console.log(
                    `[ExecuteAgent] Step completed with status: ${
                        result.status || "unknown"
                    }`
                );

                return {
                    status: result.status || "success",
                    summary: result.summary || "Step completed",
                    data: result.data || {},
                    next_step_inputs: result.next_step_inputs || {},
                    scope: this.scope,
                    history: this.executionHistory,
                };
            }

            default: {
                // Unknown action type
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
     * @returns {Object|null} - Compression stats or null if compression disabled
     */
    getCompressionStats() {
        if (!this.compressionManager) {
            return {
                enabled: false,
                message: "Compression is disabled",
            };
        }
        return this.compressionManager.getStats();
    }

    /**
     * Reset compression statistics
     */
    resetCompressionStats() {
        if (this.compressionManager) {
            this.compressionManager.resetStats();
        }
    }

    /**
     * Enable or disable compression dynamically
     * @param {boolean} enabled - Whether to enable compression
     */
    setCompressionEnabled(enabled) {
        this.compressionEnabled = enabled;
        if (this.compressionManager) {
            this.compressionManager.setEnabled(enabled);
        }
        console.log(`[ExecuteAgent] Compression ${enabled ? "enabled" : "disabled"}`);
    }
}
