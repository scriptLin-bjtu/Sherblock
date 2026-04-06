/**
 * AgentOrchestrator - Central coordinator for the blockchain analysis system
 * Manages the workflow between QuestionAgent, PlanAgent, and ExecuteAgent
 */

import { EventBus } from "./events.js";
import { WorkflowStateMachine, WorkflowStage } from "./state-machine.js";
import { QuestionAgent } from "../questionBot/agent.js";
import { PlanAgent } from "../planBot/agent.js";
import { ExecuteAgentV2 } from "../executeBot/agent-v2.js";
import { scopeManager } from "../../utils/scope-manager.js";
import { workspaceManager } from "../../utils/workspace-manager.js";
import {
    validateDAG,
    inferEdges,
    inferEdgesFromOutputs,
} from "../../utils/dag-utils.js";
import { ParallelExecutionEngine } from "./parallel-executor.js";

export { WorkflowStage } from "./state-machine.js";

export class AgentOrchestrator {
    constructor(callLLM, options = {}) {
        this.callLLM = callLLM;
        this._options = options;

        // 并行执行配置
        this.config = {
            useParallelExecution:
                options.useParallelExecution ||
                process.env.USE_PARALLEL_EXECUTION === "true",
            maxParallelTasks:
                options.maxParallelTasks ||
                parseInt(process.env.MAX_PARALLEL_TASKS, 10) ||
                3,
            continueOnFailure:
                options.continueOnFailure ??
                process.env.CONTINUE_ON_FAILURE === "true" ??
                false,
            enableReview:
                options.enableReview ??
                process.env.ENABLE_REVIEW_IN_PARALLEL === "true",
        };

        // Initialize scope manager
        this.scopeManager = scopeManager;

        // Initialize agents
        this.questionAgent = new QuestionAgent(callLLM);
        this.planAgent = new PlanAgent(callLLM);
        this.executeAgent = new ExecuteAgentV2(callLLM, scopeManager, {
            // LLM summarization config
            tokenThreshold: 100000, // Trigger summarization at 64k tokens
            preserveRecentEntries: 3, // Keep recent 3 entries unsummarized
            maxSummaries: 3, // Maximum summaries to maintain
        });

        // Initialize supporting components
        this.eventBus = new EventBus();
        this.stateMachine = new WorkflowStateMachine(WorkflowStage.IDLE);

        // Workflow state
        this.workflowState = {
            stage: WorkflowStage.IDLE,
            scope: null,
            plan: null,
            currentStepIndex: 0,
            executionHistory: [],
            reviewResults: [],
        };

        // Control flags
        this._paused = false;
        this._stopped = false;
        this._pausePromise = null;
        this._pauseResolve = null;

        // 用户输入等待 Promise（用于 WebSocket 模式）
        this._userInputPromise = null;
        this._userInputResolve = null;

        // Bind event handlers
        this._setupStateMachineHooks();
    }

    /**
     * Setup state machine hooks to sync with workflow state
     */
    _setupStateMachineHooks() {
        this.stateMachine.onEnterState(WorkflowStage.IDLE, async () => {
            this.workflowState.stage = WorkflowStage.IDLE;
            this._emit("stage:changed", {
                from: this._lastStage,
                to: WorkflowStage.IDLE,
            });
            this._lastStage = WorkflowStage.IDLE;
        });

        this.stateMachine.onEnterState(WorkflowStage.COLLECTING, async () => {
            this.workflowState.stage = WorkflowStage.COLLECTING;
            this._emit("stage:changed", {
                from: this._lastStage,
                to: WorkflowStage.COLLECTING,
            });
            this._lastStage = WorkflowStage.COLLECTING;
        });

        this.stateMachine.onEnterState(WorkflowStage.PLANNING, async () => {
            this.workflowState.stage = WorkflowStage.PLANNING;
            this._emit("stage:changed", {
                from: this._lastStage,
                to: WorkflowStage.PLANNING,
            });
            this._lastStage = WorkflowStage.PLANNING;
        });

        this.stateMachine.onEnterState(WorkflowStage.EXECUTING, async () => {
            this.workflowState.stage = WorkflowStage.EXECUTING;
            this._emit("stage:changed", {
                from: this._lastStage,
                to: WorkflowStage.EXECUTING,
            });
            this._lastStage = WorkflowStage.EXECUTING;
        });

        this.stateMachine.onEnterState(WorkflowStage.REVIEWING, async () => {
            this.workflowState.stage = WorkflowStage.REVIEWING;
            this._emit("stage:changed", {
                from: this._lastStage,
                to: WorkflowStage.REVIEWING,
            });
            this._lastStage = WorkflowStage.REVIEWING;
        });

        this.stateMachine.onEnterState(WorkflowStage.COMPLETED, async () => {
            this.workflowState.stage = WorkflowStage.COMPLETED;
            this._emit("stage:changed", {
                from: this._lastStage,
                to: WorkflowStage.COMPLETED,
            });
            this._lastStage = WorkflowStage.COMPLETED;
        });

        this._lastStage = WorkflowStage.IDLE;
    }

    /**
     * Main entry point - starts the workflow
     * @param {string} [initialInput] - Optional initial user input
     * @returns {Promise<Object>} Workflow result
     */
    async run(initialInput = null) {
        try {
            // Initialize workspace first
            await workspaceManager.initialize();

            // Initialize scope manager
            await this.scopeManager.initialize();

            // Initialize execute agent
            await this.executeAgent.initialize();

            // Start workflow
            this._emit("workflow:started", { initialInput });

            // Transition to collecting phase
            await this.stateMachine.transition(WorkflowStage.COLLECTING, {
                infos: this.questionAgent.getinfos(),
            });

            // Phase 1: Collect requirements
            const infos = await this._collectRequirements(initialInput);
            this.workflowState.scope = { ...infos };

            // Write initial scope to file
            await this.scopeManager.write(this.workflowState.scope);

            // Phase 2: Create plan
            await this.stateMachine.transition(WorkflowStage.PLANNING, {
                infos,
            });
            const plan = await this._createPlan(infos);
            this.workflowState.plan = plan;

            // Initialize scope from plan
            this.workflowState.scope = {
                ...this.workflowState.scope,
                ...plan.scope,
            };

            // Write updated scope to file
            await this.scopeManager.write(this.workflowState.scope);

            // Phase 3: Execute plan (serial or parallel based on config)
            let result;
            if (this.config.useParallelExecution) {
                // 转换为执行阶段
                await this.stateMachine.transition(WorkflowStage.EXECUTING, {
                    plan: this.workflowState.plan,
                    scope: this.workflowState.scope,
                });
                result = await this._executeWithDAG();
            } else {
                result = await this._executeWithReview();
            }

            // Complete workflow - only transition in appropriate states
            const currentState = this.stateMachine.getState();
            if (
                currentState === WorkflowStage.EXECUTING ||
                currentState === WorkflowStage.REVIEWING
            ) {
                // 检查是否使用了并行执行模式，以及是否还有剩余步骤
                const isParallelMode = this.config.useParallelExecution;
                const plan = this.workflowState.plan;
                const remainingSteps =
                    plan?.steps?.filter((s) => !s.removed) || [];

                // 并行模式且所有步骤已完成时，直接转换到 COMPLETED
                // 串行模式或仍有剩余步骤时，需要经过 REVIEWING
                const needsReview =
                    !isParallelMode || remainingSteps.length > 0;

                if (currentState === WorkflowStage.EXECUTING && needsReview) {
                    // 串行执行模式或有剩余步骤，需要先转换到 REVIEWING 状态
                    await this.stateMachine.transition(
                        WorkflowStage.REVIEWING,
                        {
                            plan: this.workflowState.plan,
                            scope: this.workflowState.scope,
                            currentStepIndex:
                                this.workflowState.currentStepIndex,
                            stepResult: {}, // 串行模式下需要 stepResult
                        },
                    );
                }
                // 然后转换到 COMPLETED
                // 并行模式：currentStepIndex 始终为 0，需要传递一个足够大的值让守卫通过
                const completedStepIndex = isParallelMode
                    ? this.workflowState.plan?.steps?.length || 0
                    : this.workflowState.currentStepIndex;
                await this.stateMachine.transition(WorkflowStage.COMPLETED, {
                    plan: this.workflowState.plan,
                    scope: this.workflowState.scope,
                    currentStepIndex: completedStepIndex,
                });
            } else if (currentState === WorkflowStage.PLANNING) {
                // If in PLANNING state (due to review modifying plan), transition directly to COMPLETED
                // All steps are completed, just the state is in PLANNING
                // 使用计划步骤总数作为 currentStepIndex
                await this.stateMachine.transition(WorkflowStage.COMPLETED, {
                    plan: this.workflowState.plan,
                    scope: this.workflowState.scope,
                    currentStepIndex:
                        this.workflowState.plan?.steps?.length || 0,
                });
            }

            this._emit("workflow:completed", { result });

            return { result };
        } catch (error) {
            this._emit("workflow:error", {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Phase 1: Collect requirements using QuestionAgent
     * @private
     */
    async _collectRequirements(initialInput) {
        this._emit("collection:started", { initialInput });

        try {
            // 检查是否有外部传入的 readline（CLI 模式）
            const hasReadline = !!this._options.readline;

            // 创建 askUser 函数
            let askUser;
            let rl = this._options.readline;
            let createdRl = false;

            if (hasReadline) {
                // CLI 模式：使用传入的 readline
                askUser = (question) => {
                    return new Promise((resolve) => {
                        rl.question(question + "\n", resolve);
                    });
                };
            } else {
                // WebSocket 模式：使用 orchestrator 的异步等待机制
                askUser = (question) => {
                    return new Promise((resolve) => {
                        // 保存 resolve 函数供外部 handleUserInput 调用
                        this._userInputResolve = resolve;
                    });
                };
            }

            // Use QuestionAgent's collectRequirements method
            const infos = await this.questionAgent.collectRequirements(
                initialInput,
                {
                    onQuestion: async (question) => {
                        this._emit("question:asked", { question });
                        // 使用对应的方式获取用户输入
                        const answer = await askUser(question);
                        return answer;
                    },
                },
            );

            // 仅在 CLI 模式且创建了 rl 时关闭
            if (!hasReadline && !rl) {
                // WebSocket 模式下不需要关闭 rl
            }

            this._emit("collection:completed", { infos });
            return infos;
        } catch (error) {
            this._emit("collection:error", { error: error.message });
            // Re-throw with additional context
            throw new Error(`Failed to collect requirements: ${error.message}`);
        }
    }

    /**
     * Phase 2: Create plan using PlanAgent
     * @private
     */
    async _createPlan(infos) {
        this._emit("planning:started", { infos });

        try {
            // Ensure executeAgent is initialized to access skill registry
            if (!this.executeAgent.initialized) {
                await this.executeAgent.initialize();
            }

            // Get capability summary from skill registry
            const capabilitiesDoc =
                this.executeAgent.skillRegistry.generateCapabilitySummary();
            console.log(
                "[Orchestrator] Generated capability summary for planning",
            );

            // Determine execution mode based on config
            const executionMode = this.config.useParallelExecution
                ? "parallel"
                : "serial";
            console.log(
                `[Orchestrator] Using ${executionMode} execution mode for planning`,
            );

            const plan = await this.planAgent.makePlan(
                infos,
                capabilitiesDoc,
                executionMode,
            );

            this._emit("planning:completed", { plan });
            return plan;
        } catch (error) {
            this._emit("planning:error", { error: error.message });
            throw error;
        }
    }

    /**
     * Phase 3: Execute plan with review loop
     * @private
     */
    async _executeWithReview() {
        this._emit("execution:started", {
            totalSteps: this.workflowState.plan.steps?.length || 0,
        });

        const results = [];

        while (
            this.workflowState.currentStepIndex <
            this.workflowState.plan.steps.length
        ) {
            // Check for stop signal
            if (this._stopped) {
                throw new Error("Workflow stopped by user");
            }

            // Wait if paused
            if (this._paused) {
                await this._waitForResume();
            }

            const stepIndex = this.workflowState.currentStepIndex;
            const step = this.workflowState.plan.steps[stepIndex];

            // Skip removed steps
            if (step.removed) {
                this.workflowState.currentStepIndex++;
                continue;
            }

            // Execute step
            await this.stateMachine.transition(WorkflowStage.EXECUTING, {
                plan: this.workflowState.plan,
                scope: this.workflowState.scope,
                stepIndex,
                step,
            });

            this._emit("step:started", { stepIndex, step });

            const result = await this._executeSingleStep(step);
            results.push(result);

            this.workflowState.executionHistory.push({
                stepIndex,
                step,
                result,
                timestamp: Date.now(),
            });

            this._emit("step:completed", { stepIndex, result });

            // Update scope with results
            if (result.scope) {
                this.workflowState.scope = {
                    ...this.workflowState.scope,
                    ...result.scope,
                };
            }

            // Review step
            await this.stateMachine.transition(WorkflowStage.REVIEWING, {
                plan: this.workflowState.plan,
                scope: this.workflowState.scope,
                currentStepIndex: this.workflowState.currentStepIndex,
                stepIndex,
                stepResult: result,
            });

            this._emit("review:started", { stepIndex });

            const reviewResult = await this._reviewStepExecution(step, result);

            this.workflowState.reviewResults.push({
                stepIndex,
                reviewResult,
                timestamp: Date.now(),
            });

            this._emit("review:completed", {
                stepIndex,
                decision: reviewResult.decision,
                adjustments: reviewResult.adjustments,
            });

            // Handle review decision
            const shouldContinue =
                await this._handleReviewDecision(reviewResult);

            if (!shouldContinue) {
                // Even when terminating, increment step index to mark this step as completed
                // This ensures transition to COMPLETED state passes guard check
                this.workflowState.currentStepIndex++;
                break;
            }

            // Move to next step
            this.workflowState.currentStepIndex++;
        }

        this._emit("execution:completed", { results });
        return { results, history: this.workflowState.executionHistory };
    }

    /**
     * Phase 3: Execute plan using DAG-based parallel execution
     * @private
     */
    async _executeWithDAG() {
        this._emit("execution:started", {
            totalSteps: this.workflowState.plan.steps?.length || 0,
            mode: "parallel",
        });

        console.log("[Orchestrator] Using DAG-based parallel execution");
        console.log(
            `[Orchestrator] Max parallel tasks: ${this.config.maxParallelTasks}`,
        );

        // 是否启用审查模式（可通过配置或环境变量控制）
        const enableReview =
            this.config.enableReview ||
            process.env.ENABLE_REVIEW_IN_PARALLEL === "true";

        // 构建并验证 DAG
        const nodes = {};
        const steps = this.workflowState.plan.steps || [];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (step.removed) continue;

            // 生成或使用 step_id
            const nodeId = step.step_id || `step_${i}`;

            nodes[nodeId] = {
                step_id: nodeId,
                goal: step.goal,
                rationale: step.rationale,
                constraints: step.constraints,
                depends_on: step.depends_on || [],
                outputs: step.outputs || [],
                index: i,
            };
        }

        // 推断边（如果依赖没有显式声明）
        const explicitEdges = inferEdges(nodes);
        const inferredEdges = inferEdgesFromOutputs(nodes);
        const edges = [
            ...explicitEdges,
            ...inferredEdges.filter(
                (e) =>
                    !explicitEdges.some(
                        (ee) => ee.from === e.from && ee.to === e.to,
                    ),
            ),
        ];

        // 验证 DAG
        const validation = validateDAG(nodes, edges);
        if (!validation.valid) {
            throw new Error(`DAG validation failed: ${validation.error}`);
        }

        console.log(
            `[Orchestrator] DAG validated: ${Object.keys(nodes).length} nodes, ${edges.length} edges`,
        );

        // 创建并行执行引擎
        const executionMode = this.config.useParallelExecution
            ? "parallel"
            : "serial";
        const executor = new ParallelExecutionEngine(
            { ...this.workflowState.plan, nodes, edges },
            this.executeAgent,
            this.scopeManager,
            {
                maxParallel: this.config.maxParallelTasks,
                continueOnFailure: this.config.continueOnFailure,
                // 审查配置
                enableReview,
                planAgent: enableReview ? this.planAgent : null,
                executionMode,
                onStepStart: (nodeId, node) => {
                    this._emit("step:started", {
                        stepIndex: node.index,
                        step: node,
                        nodeId,
                    });
                },
                onStepComplete: (nodeId, result) => {
                    this._emit("step:completed", {
                        stepIndex: nodes[nodeId].index,
                        result,
                        nodeId,
                    });
                },
                onStepError: (nodeId, error) => {
                    this._emit("step:error", {
                        stepIndex: nodes[nodeId].index,
                        error,
                        nodeId,
                    });
                },
                onBatchComplete: (nodeIds) => {
                    console.log(
                        `[Orchestrator] Batch completed: ${nodeIds.join(", ")}`,
                    );
                },
            },
        );

        // 支持审查后的 DAG 重建循环
        let currentNodes = nodes;
        let currentEdges = edges;
        let currentExecutor = executor;
        let maxRebuilds = 5; // 防止无限循环
        let rebuildCount = 0;

        while (rebuildCount <= maxRebuilds) {
            try {
                // 执行
                const executionResult = await currentExecutor.execute();

                // 检查是否需要重建 DAG
                if (executionResult.needsDAGRebuild) {
                    rebuildCount++;
                    console.log(
                        `[Orchestrator] Rebuilding DAG (${rebuildCount}/${maxRebuilds})`,
                    );

                    const reviewResult = executionResult.rebuildReason;

                    // 处理审查决策
                    if (
                        reviewResult.decision === "MODIFY_PLAN" &&
                        reviewResult.adjustments
                    ) {
                        this.workflowState.plan = this.planAgent.adjustPlan(
                            this.workflowState.plan,
                            reviewResult.adjustments,
                        );
                        console.log(
                            "[Orchestrator] Plan adjusted based on review",
                        );
                    } else if (
                        reviewResult.decision === "REORDER" &&
                        reviewResult.adjustments
                    ) {
                        const reorderAdjustment = reviewResult.adjustments.find(
                            (a) => a.type === "reorder",
                        );
                        if (reorderAdjustment && reorderAdjustment.newOrder) {
                            this.workflowState.plan =
                                this.planAgent.reorderRemainingSteps(
                                    this.workflowState.plan,
                                    reorderAdjustment.newOrder,
                                    0,
                                );
                            console.log(
                                "[Orchestrator] Steps reordered based on review",
                            );
                        }
                    }

                    // 重建 DAG
                    const newNodes = {};
                    const newSteps = this.workflowState.plan.steps || [];

                    for (let i = 0; i < newSteps.length; i++) {
                        const step = newSteps[i];
                        if (step.removed) continue;

                        const nodeId = step.step_id || `step_${i}`;
                        newNodes[nodeId] = {
                            step_id: nodeId,
                            goal: step.goal,
                            rationale: step.rationale,
                            constraints: step.constraints,
                            depends_on: step.depends_on || [],
                            outputs: step.outputs || [],
                            index: i,
                        };
                    }

                    const newExplicitEdges = inferEdges(newNodes);
                    const newInferredEdges = inferEdgesFromOutputs(newNodes);
                    currentNodes = newNodes;
                    currentEdges = [
                        ...newExplicitEdges,
                        ...newInferredEdges.filter(
                            (e) =>
                                !newExplicitEdges.some(
                                    (ee) =>
                                        ee.from === e.from && ee.to === e.to,
                                ),
                        ),
                    ];

                    // 验证新 DAG
                    const newValidation = validateDAG(
                        currentNodes,
                        currentEdges,
                    );
                    if (!newValidation.valid) {
                        throw new Error(
                            `Rebuilt DAG validation failed: ${newValidation.error}`,
                        );
                    }

                    // 创建新的执行器
                    const rebuildExecutionMode = this.config
                        .useParallelExecution
                        ? "parallel"
                        : "serial";
                    currentExecutor = new ParallelExecutionEngine(
                        {
                            ...this.workflowState.plan,
                            nodes: currentNodes,
                            edges: currentEdges,
                        },
                        this.executeAgent,
                        this.scopeManager,
                        {
                            maxParallel: this.config.maxParallelTasks,
                            continueOnFailure: this.config.continueOnFailure,
                            enableReview,
                            planAgent: enableReview ? this.planAgent : null,
                            executionMode: rebuildExecutionMode,
                            onStepStart: (nodeId, node) => {
                                this._emit("step:started", {
                                    stepIndex: node.index,
                                    step: node,
                                    nodeId,
                                });
                            },
                            onStepComplete: (nodeId, result) => {
                                this._emit("step:completed", {
                                    stepIndex: currentNodes[nodeId].index,
                                    result,
                                    nodeId,
                                });
                            },
                            onStepError: (nodeId, error) => {
                                this._emit("step:error", {
                                    stepIndex: currentNodes[nodeId].index,
                                    error,
                                    nodeId,
                                });
                            },
                            onBatchComplete: (nodeIds) => {
                                console.log(
                                    `[Orchestrator] Batch completed: ${nodeIds.join(", ")}`,
                                );
                            },
                        },
                    );

                    // 继续执行（保留已完成的结果）
                    currentExecutor.results = executionResult.results.filter(
                        (r) => !r.needsDAGRebuild,
                    );
                    continue;
                }

                // 正常完成，更新 scope
                if (executionResult.scope) {
                    this.workflowState.scope = {
                        ...this.workflowState.scope,
                        ...executionResult.scope,
                    };
                }

                // 记录执行历史
                for (const r of executionResult.results) {
                    this.workflowState.executionHistory.push({
                        stepIndex: currentNodes[r.nodeId]?.index ?? 0,
                        step: currentNodes[r.nodeId] || r.step,
                        result: r.result,
                        timestamp: Date.now(),
                    });
                }

                this._emit("execution:completed", {
                    results: executionResult.results,
                    stats: executionResult.stats,
                });

                return {
                    results: executionResult.results,
                    history: this.workflowState.executionHistory,
                    stats: executionResult.stats,
                };
            } catch (error) {
                this._emit("execution:error", { error: error.message });
                throw error;
            }
        }

        // 超过最大重建次数
        throw new Error(`Max DAG rebuilds (${maxRebuilds}) exceeded`);
    }

    /**
     * Execute a single step using ExecuteAgent
     * @private
     */
    async _executeSingleStep(step) {
        try {
            const result = await this.executeAgent.executeStep(
                this.workflowState.scope,
                step,
            );
            return result;
        } catch (error) {
            return {
                status: "failure",
                reason: error.message,
                scope: this.workflowState.scope,
                history: [],
            };
        }
    }

    /**
     * Review step execution using PlanAgent
     * @private
     */
    async _reviewStepExecution(step, executionResult) {
        const executionMode = this.config.useParallelExecution
            ? "parallel"
            : "serial";
        try {
            const reviewResult = await this.planAgent.reviewStep(
                step,
                executionResult,
                this.workflowState.scope,
                this.workflowState.plan,
                executionMode,
            );
            return reviewResult;
        } catch (error) {
            // If review fails, default to continuing
            return {
                assessment: "partial",
                findings: `Review failed: ${error.message}`,
                decision: "CONTINUE",
                adjustments: [],
                reason: "Review error, defaulting to continue",
                nextStepRecommendation: "continue",
            };
        }
    }

    /**
     * Handle review decision and apply adjustments
     * @private
     */
    async _handleReviewDecision(reviewResult) {
        const { decision, adjustments } = reviewResult;

        switch (decision) {
            case "CONTINUE":
                // Proceed to next step
                return true;

            case "MODIFY_PLAN":
                // Apply adjustments and return to planning
                if (adjustments && adjustments.length > 0) {
                    this.workflowState.plan = this.planAgent.adjustPlan(
                        this.workflowState.plan,
                        adjustments,
                    );
                }
                // Reset to planning phase to regenerate with modifications
                // Include scope in context to pass guard check
                await this.stateMachine.transition(WorkflowStage.PLANNING, {
                    infos: this.workflowState.scope,
                    scope: this.workflowState.scope,
                    plan: this.workflowState.plan,
                });
                return true;

            case "ADD_STEPS":
                // Add new steps to plan
                if (adjustments && adjustments.length > 0) {
                    this.workflowState.plan = this.planAgent.adjustPlan(
                        this.workflowState.plan,
                        adjustments,
                    );
                }
                return true;

            case "REMOVE_STEPS":
                // Remove steps from plan
                if (adjustments && adjustments.length > 0) {
                    this.workflowState.plan = this.planAgent.adjustPlan(
                        this.workflowState.plan,
                        adjustments,
                    );
                }
                return true;

            case "REORDER":
                // Reorder remaining steps
                if (adjustments && adjustments.length > 0) {
                    const reorderAdjustment = adjustments.find(
                        (a) => a.type === "reorder",
                    );
                    if (reorderAdjustment && reorderAdjustment.newOrder) {
                        this.workflowState.plan =
                            this.planAgent.reorderRemainingSteps(
                                this.workflowState.plan,
                                reorderAdjustment.newOrder,
                                this.workflowState.currentStepIndex, // pass current step index
                            );
                    }
                }
                return true;

            case "TERMINATE":
                // Terminate workflow
                return false;

            default:
                // Unknown decision, default to continue
                return true;
        }
    }

    /**
     * Wait for resume signal when paused
     * @private
     */
    async _waitForResume() {
        if (!this._paused) return;

        this._pausePromise = new Promise((resolve) => {
            this._pauseResolve = resolve;
        });

        await this._pausePromise;
    }

    /**
     * Event subscription proxy to EventBus
     */
    on(event, handler) {
        return this.eventBus.on(event, handler);
    }

    /**
     * Event unsubscription proxy to EventBus
     */
    off(event, handler) {
        this.eventBus.off(event, handler);
    }

    /**
     * Emit event through EventBus
     * @private
     */
    _emit(event, data) {
        this.eventBus.emit(event, data);
    }

    /**
     * 等待用户回答问题（用于 WebSocket 模式）
     * 返回一个 Promise，由外部通过 handleUserInput 调用 resolve
     * @private
     */
    _waitForQuestionAnswer() {
        return new Promise((resolve) => {
            this._userInputResolve = resolve;
        });
    }

    /**
     * 处理用户输入（由外部 adapter 调用）
     * @param {string} input - 用户输入
     */
    handleUserInput(input) {
        if (this._userInputResolve) {
            this._userInputResolve(input);
            this._userInputResolve = null;
        }
    }

    /**
     * Get current workflow state
     * @returns {Object} Current workflow state
     */
    getState() {
        return {
            ...this.workflowState,
            stage: this.stateMachine.getState(),
        };
    }

    /**
     * Pause workflow
     */
    pause() {
        this._paused = true;
        this._emit("workflow:paused", {});
    }

    /**
     * Resume workflow
     */
    resume() {
        this._paused = false;
        if (this._pauseResolve) {
            this._pauseResolve();
            this._pauseResolve = null;
            this._pausePromise = null;
        }
        this._emit("workflow:resumed", {});
    }

    /**
     * Stop workflow
     */
    stop() {
        this._stopped = true;
        if (this._paused) {
            this.resume(); // Resume to allow stopping
        }
        this._emit("workflow:stopped", {});
    }
}
