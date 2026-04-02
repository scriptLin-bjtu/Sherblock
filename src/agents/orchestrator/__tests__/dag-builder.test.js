/**
 * DAGBuilder 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DAGBuilder } from '../dag-builder.js';

describe('DAGBuilder - DAG 构建器', () => {
    describe('build - 构建 DAG', () => {
        it('应正确构建简单 DAG', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步', depends_on: ['step_1'] },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.nodes).toHaveProperty('step_1');
            expect(result.nodes).toHaveProperty('step_2');
            expect(result.edges).toHaveLength(1);
            expect(result.edges[0]).toEqual({ from: 'step_1', to: 'step_2' });
        });

        it('应正确识别根节点', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步', depends_on: ['step_1'] },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.rootNodes).toContain('step_1');
            expect(result.rootNodes).not.toContain('step_2');
        });

        it('应正确识别叶节点', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步', depends_on: ['step_1'] },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.leafNodes).toContain('step_2');
            expect(result.leafNodes).not.toContain('step_1');
        });

        it('应处理没有显式依赖的步骤（并行）', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '第一步' },
                    { step_id: 'step_2', goal: '第二步' },
                    { step_id: 'step_3', goal: '第三步' },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.rootNodes).toHaveLength(3);
            expect(result.edges).toHaveLength(0);
        });

        it('应抛出无效 plan 的错误', () => {
            const builder = new DAGBuilder();

            expect(() => builder.build({})).toThrow('Invalid plan');
            expect(() => builder.build(null)).toThrow('Invalid plan');
        });
    });

    describe('依赖推断', () => {
        it('应从 outputs 和变量引用推断依赖', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '获取交易', outputs: ['tx_hash'] },
                    { step_id: 'step_2', goal: '分析 ${tx_hash}' },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.edges).toHaveLength(1);
            expect(result.edges[0]).toEqual({ from: 'step_1', to: 'step_2' });
        });

        it('应合并显式依赖和推断依赖', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'A', goal: '步骤A', outputs: ['data_a'] },
                    { step_id: 'B', goal: '步骤B', depends_on: ['A'] },
                    { step_id: 'C', goal: '使用 ${data_a}', depends_on: ['B'] },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.edges.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('getDependencies - 获取依赖', () => {
        it('应返回节点的直接依赖', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'A', goal: 'A' },
                    { step_id: 'B', goal: 'B', depends_on: ['A'] },
                    { step_id: 'C', goal: 'C', depends_on: ['A', 'B'] },
                ],
            };

            const builder = new DAGBuilder();
            builder.build(plan);

            const deps = builder.getDependencies('C');
            expect(deps).toContain('A');
            expect(deps).toContain('B');
        });

        it('无依赖时应返回空数组', () => {
            const plan = {
                scope: {},
                steps: [{ step_id: 'A', goal: 'A' }],
            };

            const builder = new DAGBuilder();
            builder.build(plan);

            const deps = builder.getDependencies('A');
            expect(deps).toHaveLength(0);
        });
    });

    describe('getDependents - 获取下游依赖', () => {
        it('应返回节点的下游依赖', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'A', goal: 'A' },
                    { step_id: 'B', goal: 'B', depends_on: ['A'] },
                    { step_id: 'C', goal: 'C', depends_on: ['B'] },
                ],
            };

            const builder = new DAGBuilder();
            builder.build(plan);

            const dependents = builder.getDependents('A');
            expect(dependents).toContain('B');
            expect(dependents).not.toContain('C');
        });
    });

    describe('rebuild - 重建 DAG', () => {
        it('应重建 DAG', () => {
            const plan1 = {
                scope: {},
                steps: [{ step_id: 'step_1', goal: '步骤1' }],
            };

            const plan2 = {
                scope: {},
                steps: [
                    { step_id: 'step_1', goal: '步骤1' },
                    { step_id: 'step_2', goal: '步骤2' },
                ],
            };

            const builder = new DAGBuilder();
            builder.build(plan1);

            const result = builder.rebuild(plan2);

            expect(result.nodes).toHaveProperty('step_2');
        });
    });

    describe('DAG 验证', () => {
        it('应检测到环并抛出错误', () => {
            const plan = {
                scope: {},
                steps: [
                    { step_id: 'A', goal: 'A', depends_on: ['C'] },
                    { step_id: 'B', goal: 'B', depends_on: ['A'] },
                    { step_id: 'C', goal: 'C', depends_on: ['B'] },
                ],
            };

            const builder = new DAGBuilder();
            expect(() => builder.build(plan)).toThrow('Circular dependency');
        });
    });

    describe('默认 step_id', () => {
        it('应为没有 step_id 的步骤生成默认 ID', () => {
            const plan = {
                scope: {},
                steps: [
                    { goal: '步骤1' },
                    { goal: '步骤2', depends_on: ['step_0'] },
                ],
            };

            const builder = new DAGBuilder();
            const result = builder.build(plan);

            expect(result.nodes.step_0).toBeDefined();
            expect(result.nodes.step_1).toBeDefined();
        });
    });
});