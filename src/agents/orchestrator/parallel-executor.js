/**
 * ParallelExecutionEngine - 并行执行引擎
 * 使用 DAG 进行任务调度，支持并发执行和依赖管理
 */

import pLimit from 'p-limit';
import { DAGBuilder } from './dag-builder.js';
import { TaskScheduler, NodeStatus } from './task-scheduler.js';
import { ScopeCoordinator } from './scope-coordinator.js';

export class ParallelExecutionEngine {
    /**
     * @param {Object} plan - Plan 对象
     * @param {Object} executeAgent - ExecuteAgent 实例
     * @param {Object} scopeManager - ScopeManager 实例
     * @param {Object} options - 配置选项
     */
    constructor(plan, executeAgent, scopeManager, options = {}) {
        this.plan = plan;
        this.executeAgent = executeAgent;
        this.scopeManager = scopeManager;
        this.executionMode = options.executionMode || 'parallel';
        this.options = {
            maxParallel: options.maxParallel || 3,
            continueOnFailure: options.continueOnFailure ?? false,
            onStepStart: options.onStepStart || (() => {}),
            onStepComplete: options.onStepComplete || (() => {}),
            onStepError: options.onStepError || (() => {}),
            onBatchComplete: options.onBatchComplete || (() => {}),
            // 审查回调配置
            enableReview: options.enableReview ?? false,
            reviewCallback: options.reviewCallback || null,
            planAgent: options.planAgent || null,
        };

        // 审查模式状态
        this.reviewEnabled = this.options.enableReview;
        this.reviewCallback = this.options.reviewCallback;
        this.planAgent = this.options.planAgent;

        // 构建 DAG
        const dagBuilder = new DAGBuilder();
        this.planGraph = dagBuilder.build(plan);

        // 初始化调度器
        this.scheduler = new TaskScheduler(this.planGraph);

        // 初始化 Scope 协调器
        this.scopeCoordinator = new ScopeCoordinator(scopeManager);

        // 并发限制器
        this.limit = pLimit(this.options.maxParallel);

        // 执行结果
        this.results = [];
        this.failedSteps = [];
    }

    /**
     * 执行所有任务
     * @returns {Promise<Object>} 执行结果
     */
    async execute() {
        console.log(`[ParallelExecutor] Starting parallel execution with max ${this.options.maxParallel} concurrent tasks`);
        console.log(`[ParallelExecutor] Total steps: ${Object.keys(this.planGraph.nodes).length}`);

        try {
            // 主执行循环
            while (!this.scheduler.isComplete()) {
                // 获取就绪的节点
                const readyNodes = this.scheduler.getReadyNodes();

                if (readyNodes.length === 0) {
                    // 没有就绪节点但未完成，检查是否有失败
                    if (this.scheduler.hasFailed()) {
                        console.log('[ParallelExecutor] Found failed tasks, stopping execution');
                        break;
                    }
                    // 否则可能是有环（理论上不应该发生，因为已验证）
                    console.warn('[ParallelExecutor] No ready nodes but not complete, possible deadlock');
                    break;
                }

                // 并行执行就绪的节点
                await this._executeBatch(readyNodes);

                // 检查是否有步骤需要重建 DAG
                const needsRebuild = this.results.filter(r => r.needsDAGRebuild);
                if (needsRebuild.length > 0) {
                    console.log('[ParallelExecutor] DAG rebuild requested by review');
                    // 返回重建信息，让外部处理
                    return {
                        results: this.results,
                        failedSteps: this.failedSteps,
                        stats: this.scheduler.getStats(),
                        scope: this.scheduler.getMergedScope(),
                        needsDAGRebuild: true,
                        rebuildReason: needsRebuild[0].reviewResult,
                    };
                }

                // 批次完成回调
                this.options.onBatchComplete(readyNodes);
            }

            // 检查执行结果
            const stats = this.scheduler.getStats();

            if (stats.failed > 0 && !this.options.continueOnFailure) {
                const errors = this.scheduler.getErrors();
                throw new Error(`Execution failed: ${errors.map(e => e.error).join(', ')}`);
            }

            // 合并最终的 scope
            const finalScope = this.scheduler.getMergedScope();

            return {
                results: this.results,
                failedSteps: this.failedSteps,
                stats,
                scope: finalScope,
            };
        } catch (error) {
            console.error('[ParallelExecutor] Execution error:', error.message);
            throw error;
        }
    }

    /**
     * 执行一批就绪的节点
     * @private
     */
    async _executeBatch(readyNodes) {
        console.log(`[ParallelExecutor] Executing batch of ${readyNodes.length} tasks: ${readyNodes.join(', ')}`);

        // 使用 p-limit 并发执行
        const tasks = readyNodes.map(nodeId => {
            return this.limit(() => this._executeNode(nodeId));
        });

        await Promise.all(tasks);
    }

    /**
     * 执行单个节点
     * @private
     */
    async _executeNode(nodeId) {
        const node = this.planGraph.nodes[nodeId];
        console.log(`[ParallelExecutor] Starting task: ${nodeId} - ${node.goal}`);

        // 标记为运行中
        this.scheduler.markRunning(nodeId);

        // 步骤开始回调
        this.options.onStepStart(nodeId, node);

        // 获取当前 scope 快照（读取时不需要锁，因为是快照）
        let currentScope = await this.scopeCoordinator.acquireRead(nodeId);

        // 合并已完成步骤的 scope
        const mergedScope = this.scheduler.getMergedScope();
        currentScope = { ...mergedScope, ...currentScope };

        try {
            // 构建步骤对象
            const step = {
                step_id: nodeId,
                goal: node.goal,
                rationale: node.rationale,
                constraints: node.constraints,
                depends_on: node.depends_on,
                outputs: node.outputs,
            };

            // 执行步骤
            const result = await this.executeAgent.executeStep(currentScope, step);

            // 标记完成
            this.scheduler.markCompleted(nodeId, result);

            // 如果有 scope 更新，写入
            if (result.scope) {
                await this.scopeCoordinator.acquireWrite(nodeId, result.scope);
            }

            // 记录结果
            this.results.push({
                nodeId,
                step,
                result,
                status: 'success',
            });

            // 步骤完成回调
            this.options.onStepComplete(nodeId, result);

            // 审查模式：步骤完成后立即审查
            if (this.reviewEnabled && this.reviewCallback) {
                const reviewResult = await this._callReview(node, result, currentScope);
                this.results[this.results.length - 1].reviewResult = reviewResult;

                // 处理审查决策
                if (reviewResult.decision === 'MODIFY_PLAN' ||
                    reviewResult.decision === 'REORDER') {
                    console.log(`[ParallelExecutor] Review decision: ${reviewResult.decision}, rebuilding DAG`);

                    // 返回审查结果，通知外部重建 DAG
                    return {
                        nodeId,
                        step,
                        result,
                        status: 'success',
                        reviewResult,
                        needsDAGRebuild: true,
                    };
                }
            }

            console.log(`[ParallelExecutor] Completed task: ${nodeId}`);

        } catch (error) {
            console.error(`[ParallelExecutor] Task ${nodeId} failed:`, error.message);

            // 标记失败
            this.scheduler.markFailed(nodeId, error);

            // 记录失败
            this.failedSteps.push({
                nodeId,
                step: node,
                error: error.message,
            });

            // 步骤错误回调
            this.options.onStepError(nodeId, error);

            // 如果不允许继续执行，直接抛出错误
            if (!this.options.continueOnFailure) {
                throw error;
            }
        }
    }

    /**
     * 重建 DAG（用于计划调整后）
     * @param {Object} newPlan - 更新后的 plan
     */
    rebuildDAG(newPlan) {
        const dagBuilder = new DAGBuilder();
        this.planGraph = dagBuilder.build(newPlan);
        this.scheduler = new TaskScheduler(this.planGraph);
        this.scopeCoordinator.reset();
    }

    /**
     * 获取当前执行状态
     * @returns {Object} 执行状态
     */
    getStatus() {
        return {
            stats: this.scheduler.getStats(),
            failedSteps: this.failedSteps,
            planGraph: {
                nodeCount: Object.keys(this.planGraph.nodes).length,
                edgeCount: this.planGraph.edges.length,
            },
        };
    }

    /**
     * 调用审查回调
     * @private
     */
    async _callReview(step, executionResult, currentScope) {
        if (this.reviewCallback) {
            // 使用自定义回调
            return await this.reviewCallback(step, executionResult, currentScope, this.plan);
        } else if (this.planAgent) {
            // 使用 PlanAgent 进行审查
            try {
                return await this.planAgent.reviewStep(
                    step,
                    executionResult,
                    currentScope,
                    this.plan,
                    this.executionMode,
                );
            } catch (error) {
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

        // 没有审查功能，返回默认继续
        return {
            assessment: "success",
            findings: "No review callback configured",
            decision: "CONTINUE",
            adjustments: [],
            reason: "No review configured",
            nextStepRecommendation: "continue",
        };
    }

    /**
     * 设置审查回调（在执行过程中动态启用）
     * @param {Function} callback - 审查回调函数
     */
    setReviewCallback(callback) {
        this.reviewCallback = callback;
        this.reviewEnabled = !!callback;
    }

    /**
     * 设置 PlanAgent（用于默认审查）
     * @param {Object} planAgent - PlanAgent 实例
     */
    setPlanAgent(planAgent) {
        this.planAgent = planAgent;
        if (planAgent) {
            this.reviewEnabled = true;
        }
    }

    /**
     * 启用/禁用审查模式
     * @param {boolean} enabled - 是否启用审查
     */
    setReviewEnabled(enabled) {
        this.reviewEnabled = enabled;
    }
}