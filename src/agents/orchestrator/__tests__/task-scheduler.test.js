/**
 * TaskScheduler 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskScheduler, NodeStatus } from '../task-scheduler.js';

describe('TaskScheduler - 任务调度器', () => {
    describe('初始化', () => {
        it('应正确初始化所有节点状态', () => {
            const planGraph = {
                nodes: {
                    step_1: { goal: '步骤1' },
                    step_2: { goal: '步骤2' },
                },
                edges: [{ from: 'step_1', to: 'step_2' }],
            };

            const scheduler = new TaskScheduler(planGraph);

            expect(scheduler.getStatus('step_1')).toBe(NodeStatus.PENDING);
            expect(scheduler.getStatus('step_2')).toBe(NodeStatus.PENDING);
        });

        it('应处理空图', () => {
            const planGraph = {
                nodes: {},
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            expect(scheduler.isComplete()).toBe(true);
        });
    });

    describe('getReadyNodes - 获取就绪节点', () => {
        it('应返回所有根节点（无依赖）作为就绪节点', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            const ready = scheduler.getReadyNodes();

            expect(ready).toContain('step_1');
            expect(ready).toContain('step_2');
        });

        it('依赖未完成时不应返回依赖节点', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [{ from: 'step_1', to: 'step_2' }],
            };

            const scheduler = new TaskScheduler(planGraph);
            const ready = scheduler.getReadyNodes();

            expect(ready).toContain('step_1');
            expect(ready).not.toContain('step_2');
        });

        it('所有依赖完成时应返回依赖节点', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                    step_3: {},
                },
                edges: [
                    { from: 'step_1', to: 'step_3' },
                    { from: 'step_2', to: 'step_3' },
                ],
            };

            const scheduler = new TaskScheduler(planGraph);

            // 标记 step_1 和 step_2 完成
            scheduler.markRunning('step_1');
            scheduler.markCompleted('step_1', { result: 'ok' });
            scheduler.markRunning('step_2');
            scheduler.markCompleted('step_2', { result: 'ok' });

            const ready = scheduler.getReadyNodes();
            expect(ready).toContain('step_3');
        });
    });

    describe('状态管理', () => {
        it('应正确标记节点为运行中', () => {
            const planGraph = {
                nodes: { step_1: {} },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markRunning('step_1');

            expect(scheduler.getStatus('step_1')).toBe(NodeStatus.RUNNING);
        });

        it('应正确标记节点为已完成', () => {
            const planGraph = {
                nodes: { step_1: {} },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            const result = { status: 'success', data: 'test' };
            scheduler.markCompleted('step_1', result);

            expect(scheduler.getStatus('step_1')).toBe(NodeStatus.COMPLETED);
            expect(scheduler.getResult('step_1')).toEqual(result);
        });

        it('应正确标记节点为失败', () => {
            const planGraph = {
                nodes: { step_1: {} },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            const error = new Error('Execution failed');
            scheduler.markFailed('step_1', error);

            expect(scheduler.getStatus('step_1')).toBe(NodeStatus.FAILED);
            expect(scheduler.getErrors()[0].error).toBe('Execution failed');
        });

        it('应正确跳过节点', () => {
            const planGraph = {
                nodes: { step_1: {} },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markSkipped('step_1');

            expect(scheduler.getStatus('step_1')).toBe(NodeStatus.SKIPPED);
        });
    });

    describe('isComplete - 完成检查', () => {
        it('所有节点完成后应返回 true', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markCompleted('step_1', {});
            scheduler.markCompleted('step_2', {});

            expect(scheduler.isComplete()).toBe(true);
        });

        it('有未完成节点时应返回 false', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markCompleted('step_1', {});

            expect(scheduler.isComplete()).toBe(false);
        });

        it('有失败节点时 isComplete 应返回 true（失败也是最终状态）', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markCompleted('step_1', {});
            scheduler.markFailed('step_2', new Error('failed'));

            expect(scheduler.isComplete()).toBe(true);
            expect(scheduler.hasFailed()).toBe(true);
        });

        it('有跳过的节点时 isComplete 应返回 true', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markCompleted('step_1', {});
            scheduler.markSkipped('step_2');

            expect(scheduler.isComplete()).toBe(true);
        });
    });

    describe('hasFailed - 失败检查', () => {
        it('无失败节点时应返回 false', () => {
            const planGraph = {
                nodes: { step_1: {} },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markCompleted('step_1', {});

            expect(scheduler.hasFailed()).toBe(false);
        });

        it('有失败节点时应返回 true', () => {
            const planGraph = {
                nodes: { step_1: {} },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markFailed('step_1', new Error('failed'));

            expect(scheduler.hasFailed()).toBe(true);
        });
    });

    describe('getStats - 统计信息', () => {
        it('应返回正确的统计信息', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                    step_3: {},
                },
                edges: [],
            };

            const scheduler = new TaskScheduler(planGraph);

            scheduler.markCompleted('step_1', {});
            scheduler.markRunning('step_2');
            // step_3 保持 pending

            const stats = scheduler.getStats();

            expect(stats.completed).toBe(1);
            expect(stats.running).toBe(1);
            expect(stats.pending).toBe(1);
            expect(stats.failed).toBe(0);
            expect(stats.skipped).toBe(0);
        });
    });

    describe('getMergedScope - 合并 Scope', () => {
        it('应按拓扑顺序合并 scope', () => {
            const planGraph = {
                nodes: {
                    step_1: {},
                    step_2: {},
                },
                edges: [{ from: 'step_1', to: 'step_2' }],
            };

            const scheduler = new TaskScheduler(planGraph);
            scheduler.markCompleted('step_1', { scope: { a: 1 } });
            scheduler.markCompleted('step_2', { scope: { b: 2 } });

            const merged = scheduler.getMergedScope();

            expect(merged.a).toBe(1);
            expect(merged.b).toBe(2);
        });
    });
});