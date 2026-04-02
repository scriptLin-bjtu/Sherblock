/**
 * DAG 工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import { validateDAG, inferEdges, inferEdgesFromOutputs, topologicalSort, getParallelBatches } from '../dag-utils.js';

describe('DAG 工具函数', () => {
    describe('validateDAG - 环检测', () => {
        it('应正确识别有效的 DAG', () => {
            const nodes = {
                step_1: {},
                step_2: {},
                step_3: {},
            };
            const edges = [
                { from: 'step_1', to: 'step_2' },
                { from: 'step_2', to: 'step_3' },
            ];

            const result = validateDAG(nodes, edges);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('应正确检测简单环', () => {
            const nodes = {
                step_1: {},
                step_2: {},
                step_3: {},
            };
            const edges = [
                { from: 'step_1', to: 'step_2' },
                { from: 'step_2', to: 'step_3' },
                { from: 'step_3', to: 'step_1' }, // 形成环
            ];

            const result = validateDAG(nodes, edges);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Circular dependency');
        });

        it('应正确检测自环', () => {
            const nodes = {
                step_1: {},
            };
            const edges = [
                { from: 'step_1', to: 'step_1' }, // 自环
            ];

            const result = validateDAG(nodes, edges);
            expect(result.valid).toBe(false);
        });

        it('应正确检测复杂环', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
                D: {},
            };
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
                { from: 'C', to: 'D' },
                { from: 'D', to: 'B' }, // 环: B -> C -> D -> B
            ];

            const result = validateDAG(nodes, edges);
            expect(result.valid).toBe(false);
            expect(result.cycle).toBeDefined();
        });

        it('应处理空图', () => {
            const nodes = {};
            const edges = [];

            const result = validateDAG(nodes, edges);
            expect(result.valid).toBe(true);
        });

        it('应处理独立节点（无依赖）', () => {
            const nodes = {
                step_1: {},
                step_2: {},
                step_3: {},
            };
            const edges = [];

            const result = validateDAG(nodes, edges);
            expect(result.valid).toBe(true);
        });
    });

    describe('inferEdges - 从 depends_on 推断边', () => {
        it('应正确推断显式依赖', () => {
            const nodes = {
                step_1: {},
                step_2: { depends_on: ['step_1'] },
                step_3: { depends_on: ['step_2'] },
            };

            const edges = inferEdges(nodes);
            expect(edges).toHaveLength(2);
            expect(edges).toContainEqual({ from: 'step_1', to: 'step_2' });
            expect(edges).toContainEqual({ from: 'step_2', to: 'step_3' });
        });

        it('应处理多依赖', () => {
            const nodes = {
                A: {},
                B: {},
                C: { depends_on: ['A', 'B'] },
            };

            const edges = inferEdges(nodes);
            expect(edges).toHaveLength(2);
            expect(edges).toContainEqual({ from: 'A', to: 'C' });
            expect(edges).toContainEqual({ from: 'B', to: 'C' });
        });

        it('应处理空 depends_on', () => {
            const nodes = {
                step_1: {},
                step_2: { depends_on: [] },
            };

            const edges = inferEdges(nodes);
            expect(edges).toHaveLength(0);
        });

        it('应忽略无效的 depends_on', () => {
            const nodes = {
                step_1: {},
                step_2: { depends_on: ['non_existent'] },
            };

            const edges = inferEdges(nodes);
            expect(edges).toHaveLength(1);
            expect(edges[0]).toEqual({ from: 'non_existent', to: 'step_2' });
        });
    });

    describe('inferEdgesFromOutputs - 从输出推断边', () => {
        it('应正确从 outputs 推断依赖', () => {
            const nodes = {
                step_1: { outputs: ['tx_hash', 'balance'] },
                step_2: { goal: '分析 ${tx_hash} 的详情' },
            };

            const edges = inferEdgesFromOutputs(nodes);
            expect(edges).toHaveLength(1);
            expect(edges[0]).toEqual({ from: 'step_1', to: 'step_2' });
        });

        it('应正确从多个输出推断依赖', () => {
            const nodes = {
                A: { outputs: ['data_a'] },
                B: { outputs: ['data_b'] },
                C: { goal: '使用 ${data_a} 和 ${data_b}' },
            };

            const edges = inferEdgesFromOutputs(nodes);
            expect(edges).toHaveLength(2);
        });

        it('应忽略引用自己的输出', () => {
            const nodes = {
                step_1: {
                    outputs: ['my_output'],
                    goal: '使用 ${my_output}',
                },
            };

            const edges = inferEdgesFromOutputs(nodes);
            expect(edges).toHaveLength(0);
        });

        it('应处理没有 outputs 的节点', () => {
            const nodes = {
                step_1: {},
                step_2: { goal: '使用 ${some_var}' },
            };

            const edges = inferEdgesFromOutputs(nodes);
            expect(edges).toHaveLength(0);
        });

        it('应处理没有变量引用的节点', () => {
            const nodes = {
                step_1: { outputs: ['result'] },
                step_2: { goal: '执行某个操作' },
            };

            const edges = inferEdgesFromOutputs(nodes);
            expect(edges).toHaveLength(0);
        });
    });

    describe('topologicalSort - 拓扑排序', () => {
        it('应返回正确的拓扑排序', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
            };
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
            ];

            const sorted = topologicalSort(nodes, edges);
            expect(sorted).not.toBeNull();
            expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
            expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('C'));
        });

        it('应处理有多个根节点的情况', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
            };
            const edges = [
                { from: 'A', to: 'C' },
                { from: 'B', to: 'C' },
            ];

            const sorted = topologicalSort(nodes, edges);
            expect(sorted).not.toBeNull();
            expect(sorted.indexOf('C')).toBeGreaterThan(sorted.indexOf('A'));
            expect(sorted.indexOf('C')).toBeGreaterThan(sorted.indexOf('B'));
        });

        it('有环时应返回 null', () => {
            const nodes = {
                A: {},
                B: {},
            };
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'A' },
            ];

            const sorted = topologicalSort(nodes, edges);
            expect(sorted).toBeNull();
        });

        it('应处理空图', () => {
            const sorted = topologicalSort({}, []);
            expect(sorted).toEqual([]);
        });
    });

    describe('getParallelBatches - 并行批次计算', () => {
        it('应正确计算并行批次', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
            };
            const edges = [
                { from: 'A', to: 'C' },
                { from: 'B', to: 'C' },
            ];

            const batches = getParallelBatches(nodes, edges);
            expect(batches).toHaveLength(2);
            expect(batches[0]).toContain('A');
            expect(batches[0]).toContain('B');
            expect(batches[1]).toContain('C');
        });

        it('应处理完全独立的节点', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
            };
            const edges = [];

            const batches = getParallelBatches(nodes, edges);
            expect(batches).toHaveLength(1);
            expect(batches[0]).toHaveLength(3);
        });

        it('应处理线性依赖链', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
                D: {},
            };
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
                { from: 'C', to: 'D' },
            ];

            const batches = getParallelBatches(nodes, edges);
            expect(batches).toHaveLength(4);
            expect(batches[0]).toEqual(['A']);
            expect(batches[1]).toEqual(['B']);
            expect(batches[2]).toEqual(['C']);
            expect(batches[3]).toEqual(['D']);
        });

        it('应处理复杂的依赖图', () => {
            const nodes = {
                A: {},
                B: {},
                C: {},
                D: {},
                E: {},
            };
            // A -> B -> D -> E
            // A -> C -> D
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'A', to: 'C' },
                { from: 'B', to: 'D' },
                { from: 'C', to: 'D' },
                { from: 'D', to: 'E' },
            ];

            const batches = getParallelBatches(nodes, edges);
            expect(batches[0]).toContain('A');
            expect(batches[1]).toContain('B');
            expect(batches[1]).toContain('C');
            expect(batches[2]).toContain('D');
            expect(batches[3]).toContain('E');
        });

        it('应处理空图', () => {
            const batches = getParallelBatches({}, []);
            expect(batches).toHaveLength(0);
        });
    });
});