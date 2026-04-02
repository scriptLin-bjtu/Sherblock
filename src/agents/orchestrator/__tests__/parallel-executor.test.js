/**
 * ParallelExecutionEngine 集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParallelExecutionEngine } from '../parallel-executor.js';
import { NodeStatus } from '../task-scheduler.js';

describe('ParallelExecutionEngine - 并行执行引擎', () => {
    let mockExecuteAgent;
    let mockScopeManager;
    let mockPlan;

    beforeEach(() => {
        // Mock ExecuteAgent
        mockExecuteAgent = {
            executeStep: vi.fn().mockImplementation(async (scope, step) => {
                // 模拟步骤执行
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    status: 'success',
                    result: `Completed: ${step.goal}`,
                    scope: { [`${step.step_id}_result`]: 'done' },
                };
            }),
        };

        // Mock ScopeManager
        mockScopeManager = {
            _data: {},
            get() {
                return this._data;
            },
            async read() {
                // 模拟从文件读取
            },
            async write(data) {
                this._data = data;
            },
        };

        // 基础 plan
        mockPlan = {
            scope: {},
            steps: [
                { step_id: 'step_1', goal: '第一步', outputs: ['data1'] },
                { step_id: 'step_2', goal: '第二步', outputs: ['data2'] },
            ],
        };
    });

    describe('基本执行', () => {
        it('应成功执行所有步骤', async () => {
            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            const result = await engine.execute();

            expect(result.stats.completed).toBe(2);
            expect(result.stats.failed).toBe(0);
        });

        it('应正确统计执行结果', async () => {
            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            const result = await engine.execute();

            expect(result.results).toHaveLength(2);
            expect(result.failedSteps).toHaveLength(0);
        });

        it('应合并最终的 scope', async () => {
            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            const result = await engine.execute();

            expect(result.scope.step_1_result).toBe('done');
            expect(result.scope.step_2_result).toBe('done');
        });
    });

    describe('依赖调度', () => {
        it('应按依赖顺序执行步骤', async () => {
            const planWithDeps = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步', depends_on: ['step_1'] },
                ],
            };

            const executionOrder = [];
            const orderedExecuteAgent = {
                executeStep: vi.fn().mockImplementation(async (scope, step) => {
                    executionOrder.push(step.step_id);
                    return {
                        status: 'success',
                        result: `Completed: ${step.goal}`,
                    };
                }),
            };

            const engine = new ParallelExecutionEngine(
                planWithDeps,
                orderedExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            await engine.execute();

            // step_1 应该在 step_2 之前执行
            expect(executionOrder.indexOf('step_1')).toBeLessThan(executionOrder.indexOf('step_2'));
        });

        it('应正确处理多个根节点的并行执行', async () => {
            const planWithMultipleRoots = {
                scope: {},
                steps: [
                    { step_id: 'A', goal: '任务A' },
                    { step_id: 'B', goal: '任务B' },
                    { step_id: 'C', goal: '任务C', depends_on: ['A', 'B'] },
                ],
            };

            const executionOrder = [];
            const orderedExecuteAgent = {
                executeStep: vi.fn().mockImplementation(async (scope, step) => {
                    executionOrder.push(step.step_id);
                    return {
                        status: 'success',
                        result: `Completed: ${step.goal}`,
                    };
                }),
            };

            const engine = new ParallelExecutionEngine(
                planWithMultipleRoots,
                orderedExecuteAgent,
                mockScopeManager,
                { maxParallel: 3 }
            );

            const result = await engine.execute();

            // A 和 B 应该并行执行（在 C 之前）
            const aIndex = executionOrder.indexOf('A');
            const bIndex = executionOrder.indexOf('B');
            const cIndex = executionOrder.indexOf('C');

            expect(cIndex).toBeGreaterThan(aIndex);
            expect(cIndex).toBeGreaterThan(bIndex);
        });
    });

    describe('并发控制', () => {
        it('应限制最大并发数', async () => {
            const parallelPlan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '步骤1' },
                    { step_id: 'step_2', goal: '步骤2' },
                    { step_id: 'step_3', goal: '步骤3' },
                ],
            };

            let concurrentCount = 0;
            let maxConcurrent = 0;

            const countingExecuteAgent = {
                executeStep: vi.fn().mockImplementation(async (scope, step) => {
                    concurrentCount++;
                    maxConcurrent = Math.max(maxConcurrent, concurrentCount);
                    await new Promise(resolve => setTimeout(resolve, 20));
                    concurrentCount--;
                    return { status: 'success' };
                }),
            };

            const engine = new ParallelExecutionEngine(
                parallelPlan,
                countingExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            await engine.execute();

            // 最大并发应该不超过 2
            expect(maxConcurrent).toBeLessThanOrEqual(2);
        });
    });

    describe('失败处理', () => {
        it('应在步骤失败时抛出错误', async () => {
            const failingExecuteAgent = {
                executeStep: vi.fn().mockRejectedValue(new Error('Step failed')),
            };

            const engine = new ParallelExecutionEngine(
                mockPlan,
                failingExecuteAgent,
                mockScopeManager,
                { maxParallel: 2, continueOnFailure: false }
            );

            await expect(engine.execute()).rejects.toThrow('Step failed');
        });

        it('应在 continueOnFailure 时记录失败但继续执行', async () => {
            const callCount = { value: 0 };
            const failingExecuteAgent = {
                executeStep: vi.fn().mockImplementation(async (scope, step) => {
                    callCount.value++;
                    if (callCount.value === 1) {
                        throw new Error('First step failed');
                    }
                    return { status: 'success' };
                }),
            };

            const engine = new ParallelExecutionEngine(
                mockPlan,
                failingExecuteAgent,
                mockScopeManager,
                { maxParallel: 2, continueOnFailure: true }
            );

            const result = await engine.execute();

            expect(result.stats.failed).toBe(1);
            expect(result.failedSteps).toHaveLength(1);
        });

        it('应在失败时正确设置状态', async () => {
            const failingExecuteAgent = {
                executeStep: vi.fn().mockRejectedValue(new Error('Test error')),
            };

            // 使用有依赖的 plan
            const planWithDeps = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步', depends_on: ['step_1'] },
                ],
            };

            const engine = new ParallelExecutionEngine(
                planWithDeps,
                failingExecuteAgent,
                mockScopeManager,
                { maxParallel: 2, continueOnFailure: true }
            );

            const result = await engine.execute();

            // step_1 失败后，step_2 不会执行（因为依赖 step_1）
            expect(engine.scheduler.getStatus('step_1')).toBe(NodeStatus.FAILED);
            // step_2 应该仍然是 pending 状态（因为它的依赖失败了）
            expect(result.stats.pending).toBe(1);
        });
    });

    describe('回调功能', () => {
        it('应调用 onStepStart 回调', async () => {
            const onStepStart = vi.fn();

            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2, onStepStart }
            );

            await engine.execute();

            expect(onStepStart).toHaveBeenCalledTimes(2);
        });

        it('应调用 onStepComplete 回调', async () => {
            const onStepComplete = vi.fn();

            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2, onStepComplete }
            );

            await engine.execute();

            expect(onStepComplete).toHaveBeenCalledTimes(2);
        });

        it('应调用 onStepError 回调', async () => {
            const onStepError = vi.fn();
            const failingExecuteAgent = {
                executeStep: vi.fn().mockRejectedValue(new Error('Error')),
            };

            const engine = new ParallelExecutionEngine(
                mockPlan,
                failingExecuteAgent,
                mockScopeManager,
                { maxParallel: 2, continueOnFailure: true, onStepError }
            );

            await engine.execute();

            expect(onStepError).toHaveBeenCalled();
        });
    });

    describe('getStatus - 获取状态', () => {
        it('应返回正确的执行状态', async () => {
            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            const status = engine.getStatus();

            expect(status.stats).toBeDefined();
            expect(status.planGraph.nodeCount).toBe(2);
            expect(status.planGraph.edgeCount).toBe(0);
        });
    });

    describe('rebuildDAG - 重建 DAG', () => {
        it('应重建 DAG', async () => {
            const engine = new ParallelExecutionEngine(
                mockPlan,
                mockExecuteAgent,
                mockScopeManager,
                { maxParallel: 2 }
            );

            const newPlan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步' },
                    { step_id: 'step_3', goal: '第三步' },
                ],
            };

            engine.rebuildDAG(newPlan);

            const status = engine.getStatus();
            expect(status.planGraph.nodeCount).toBe(3);
        });
    });
});