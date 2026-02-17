import { prompt, formatObservation } from "./prompt.js";
import { SKILLS, buildSkillUrl, SUPPORTED_CHAINS } from "./skills.js";
import { ProxyAgent } from "undici";

/**
 * 本地代理配置
 */
const PROXY_HOST = process.env.HTTP_PROXY || "http://127.0.0.1:7890";
const proxyAgent = new ProxyAgent(PROXY_HOST);

/**
 * ExecuteAgent - Executes individual steps from the analysis plan
 * Uses ReAct (Reasoning + Acting) pattern
 */
export class ExecuteAgent {
    constructor(callLLM) {
        this.callLLM = callLLM;
        this.scope = null;
        this.currentStep = null;
        this.executionHistory = [];
        this.maxIterations = 20; // Safety limit
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Get the Etherscan API key from environment
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
    mergeUpdates(updates) {
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
    }

    /**
     * Execute a blockchain analysis skill via Etherscan API
     */
    async executeSkill(skillName, params, chainId) {
        const skill = SKILLS[skillName];
        if (!skill) {
            return {
                success: false,
                error: `Unknown skill: ${skillName}`,
            };
        }

        // Validate required parameters
        const missingParams = skill.params.required.filter(
            (p) => !params[p] && params[p] !== 0
        );
        if (missingParams.length > 0) {
            return {
                success: false,
                error: `Missing required parameters: ${missingParams.join(
                    ", "
                )}`,
            };
        }

        try {
            const url = buildSkillUrl(
                skillName,
                params,
                chainId || this.getChainId(),
                this.getApiKey()
            );

            console.log(`[ExecuteAgent] Calling: ${skillName}`);

            const response = await fetch(url, {
                dispatcher: proxyAgent, // 使用本地代理
                signal: AbortSignal.timeout(30000), // 30秒超时
            });
            const result = await response.json();

            return formatObservation(result, skillName);
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

        // Start the ReAct loop with initial observation
        const initialObservation = `Starting execution of step: "${
            currentStep.goal
        }".
Success criteria: ${JSON.stringify(currentStep.success_criteria)}
Constraints: ${JSON.stringify(currentStep.constraints || "none")}`;

        return await this.react(initialObservation);
    }

    /**
     * ReAct core loop - Reasoning + Acting
     */
    async react(observation) {
        // Add observation to history
        this.executionHistory.push({
            type: "OBSERVATION",
            content: observation,
        });

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

        // Call LLM for next action
        const res = await this.callLLM({
            systemPrompt: prompt(
                this.scope,
                this.currentStep,
                this.executionHistory
            ),
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: [{ type: "text", text: observation }],
            modelProvider: "deepseek",
        });

        console.log(
            "[ExecuteAgent] Thought & Action:",
            JSON.stringify(res, null, 2)
        );

        // Extract parsed action
        const action = res.data || res;

        // Record action in history
        this.executionHistory.push({
            type: "ACTION",
            content: action,
        });

        // Execute the action
        return await this.executeAction(action);
    }

    /**
     * Execute the action returned by LLM
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
                return await this.react(
                    `Skill ${skill_name} result:\n${JSON.stringify(
                        result.content,
                        null,
                        2
                    )}`
                );
            }

            case "UPDATE_SCOPE": {
                // Update scope with new findings
                if (action.updates) {
                    this.mergeUpdates(action.updates);
                    console.log(
                        "[ExecuteAgent] Scope updated:",
                        JSON.stringify(action.updates, null, 2)
                    );
                }

                await new Promise((r) => setTimeout(r, 200));
                return await this.react(
                    `Scope updated successfully. Current scope keys: ${Object.keys(
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
}
