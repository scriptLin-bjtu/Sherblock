/**
 * DAGBuilder - 从 Plan 构建有向无环图
 * 支持从 depends_on 字段和变量引用推断依赖关系
 */

import { validateDAG, inferEdges, inferEdgesFromOutputs } from '../../utils/dag-utils.js';

export class DAGBuilder {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    /**
     * 从 plan 对象构建 DAG
     * @param {Object} plan - Plan 对象，包含 scope 和 steps
     * @returns {Object} { nodes, edges, rootNodes, leafNodes }
     */
    build(plan) {
        if (!plan || !plan.steps) {
            throw new Error('Invalid plan: missing steps');
        }

        // 转换 steps 为节点
        this._buildNodes(plan.steps);

        // 推断边（从 depends_on 和变量引用）
        this._buildEdges();

        // 验证 DAG 无环
        const validationResult = validateDAG(
            Object.fromEntries(this.nodes),
            this.edges
        );

        if (!validationResult.valid) {
            throw new Error(validationResult.error);
        }

        // 计算根节点和叶节点
        const rootNodes = this._getRootNodes();
        const leafNodes = this._getLeafNodes();

        return {
            nodes: Object.fromEntries(this.nodes),
            edges: this.edges,
            rootNodes,
            leafNodes,
        };
    }

    /**
     * 将 steps 转换为节点
     * @private
     */
    _buildNodes(steps) {
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepId = step.step_id || `step_${i}`;

            this.nodes.set(stepId, {
                step_id: stepId,
                goal: step.goal,
                rationale: step.rationale,
                constraints: step.constraints,
                depends_on: step.depends_on || [],
                outputs: step.outputs || [],
                // 如果没有显式依赖，尝试从变量引用推断
                _inferredDeps: [],
            });
        }
    }

    /**
     * 构建边（依赖关系）
     * @private
     */
    _buildEdges() {
        // 1. 从显式 depends_on 构建边
        const explicitEdges = inferEdges(Object.fromEntries(this.nodes));

        // 2. 从变量引用推断边
        const inferredEdges = inferEdgesFromOutputs(Object.fromEntries(this.nodes));

        // 合并边，避免重复
        const edgeSet = new Set();

        for (const edge of [...explicitEdges, ...inferredEdges]) {
            const key = `${edge.from}->${edge.to}`;
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                this.edges.push(edge);
            }
        }

        // 更新节点的推断依赖
        for (const edge of this.edges) {
            const node = this.nodes.get(edge.to);
            if (node) {
                if (!node._inferredDeps.includes(edge.from)) {
                    node._inferredDeps.push(edge.from);
                }
            }
        }
    }

    /**
     * 获取根节点（没有依赖的节点）
     * @private
     */
    _getRootNodes() {
        const roots = [];

        for (const [nodeId, node] of this.nodes) {
            const hasIncoming = this.edges.some(e => e.to === nodeId);
            if (!hasIncoming) {
                roots.push(nodeId);
            }
        }

        return roots;
    }

    /**
     * 获取叶节点（没有下游依赖的节点）
     * @private
     */
    _getLeafNodes() {
        const leaves = [];

        for (const [nodeId, node] of this.nodes) {
            const hasOutgoing = this.edges.some(e => e.from === nodeId);
            if (!hasOutgoing) {
                leaves.push(nodeId);
            }
        }

        return leaves;
    }

    /**
     * 获取节点的所有前置依赖
     * @param {string} nodeId - 节点ID
     * @returns {string[]} 依赖节点ID数组
     */
    getDependencies(nodeId) {
        const deps = [];

        for (const edge of this.edges) {
            if (edge.to === nodeId) {
                deps.push(edge.from);
            }
        }

        return deps;
    }

    /**
     * 获取节点的所有下游依赖
     * @param {string} nodeId - 节点ID
     * @returns {string[]} 下游节点ID数组
     */
    getDependents(nodeId) {
        const dependents = [];

        for (const edge of this.edges) {
            if (edge.from === nodeId) {
                dependents.push(edge.to);
            }
        }

        return dependents;
    }

    /**
     * 重建 DAG（用于计划调整后）
     * @param {Object} plan - 更新后的 plan 对象
     * @returns {Object} 新的 DAG 结构
     */
    rebuild(plan) {
        this.nodes = new Map();
        this.edges = [];
        return this.build(plan);
    }
}