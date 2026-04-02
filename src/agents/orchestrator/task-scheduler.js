/**
 * TaskScheduler - 任务调度器
 * 管理 DAG 节点的执行状态，计算就绪节点
 */

export const NodeStatus = {
    PENDING: 'pending',      // 等待执行
    RUNNING: 'running',      // 正在执行
    COMPLETED: 'completed',  // 已完成
    FAILED: 'failed',        // 执行失败
    SKIPPED: 'skipped',      // 已跳过
};

export class TaskScheduler {
    /**
     * @param {Object} planGraph - DAG 结构 { nodes, edges }
     */
    constructor(planGraph) {
        this.planGraph = planGraph;
        this.nodes = planGraph.nodes;
        this.edges = planGraph.edges;

        // 节点状态
        this.nodeStatus = new Map();
        // 节点结果
        this.nodeResults = new Map();
        // 节点执行错误
        this.nodeErrors = new Map();

        // 初始化所有节点状态
        this._initializeStatuses();
    }

    /**
     * 初始化所有节点状态
     * @private
     */
    _initializeStatuses() {
        for (const nodeId of Object.keys(this.nodes)) {
            this.nodeStatus.set(nodeId, NodeStatus.PENDING);
            this.nodeResults.set(nodeId, null);
            this.nodeErrors.set(nodeId, null);
        }
    }

    /**
     * 获取所有就绪执行的节点（依赖都已完成）
     * @returns {string[]} 就绪节点ID数组
     */
    getReadyNodes() {
        const readyNodes = [];

        for (const nodeId of Object.keys(this.nodes)) {
            const status = this.nodeStatus.get(nodeId);

            // 只考虑待执行的节点
            if (status !== NodeStatus.PENDING) {
                continue;
            }

            // 检查所有依赖是否都已完成
            const deps = this._getDependencies(nodeId);
            const allDepsCompleted = deps.every(depId => {
                const depStatus = this.nodeStatus.get(depId);
                return depStatus === NodeStatus.COMPLETED;
            });

            if (allDepsCompleted) {
                readyNodes.push(nodeId);
            }
        }

        return readyNodes;
    }

    /**
     * 获取节点的直接依赖
     * @param {string} nodeId - 节点ID
     * @returns {string[]} 依赖节点ID数组
     * @private
     */
    _getDependencies(nodeId) {
        const deps = [];
        for (const edge of this.edges) {
            if (edge.to === nodeId) {
                deps.push(edge.from);
            }
        }
        return deps;
    }

    /**
     * 获取节点的下游依赖
     * @param {string} nodeId - 节点ID
     * @returns {string[]} 下游节点ID数组
     * @private
     */
    _getDependents(nodeId) {
        const dependents = [];
        for (const edge of this.edges) {
            if (edge.from === nodeId) {
                dependents.push(edge.to);
            }
        }
        return dependents;
    }

    /**
     * 标记节点开始执行
     * @param {string} nodeId - 节点ID
     */
    markRunning(nodeId) {
        if (this.nodeStatus.has(nodeId)) {
            this.nodeStatus.set(nodeId, NodeStatus.RUNNING);
        }
    }

    /**
     * 标记节点执行完成
     * @param {string} nodeId - 节点ID
     * @param {Object} result - 执行结果
     */
    markCompleted(nodeId, result) {
        if (this.nodeStatus.has(nodeId)) {
            this.nodeStatus.set(nodeId, NodeStatus.COMPLETED);
            this.nodeResults.set(nodeId, result);
        }
    }

    /**
     * 标记节点执行失败
     * @param {string} nodeId - 节点ID
     * @param {Error} error - 错误对象
     */
    markFailed(nodeId, error) {
        if (this.nodeStatus.has(nodeId)) {
            this.nodeStatus.set(nodeId, NodeStatus.FAILED);
            this.nodeErrors.set(nodeId, error);
        }
    }

    /**
     * 跳过节点（用于依赖链中有失败的情况）
     * @param {string} nodeId - 节点ID
     */
    markSkipped(nodeId) {
        if (this.nodeStatus.has(nodeId)) {
            this.nodeStatus.set(nodeId, NodeStatus.SKIPPED);
        }
    }

    /**
     * 获取节点状态
     * @param {string} nodeId - 节点ID
     * @returns {string} 节点状态
     */
    getStatus(nodeId) {
        return this.nodeStatus.get(nodeId);
    }

    /**
     * 获取节点结果
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 执行结果
     */
    getResult(nodeId) {
        return this.nodeResults.get(nodeId);
    }

    /**
     * 检查是否所有节点都已完成
     * @returns {boolean}
     */
    isComplete() {
        for (const status of this.nodeStatus.values()) {
            if (status !== NodeStatus.COMPLETED &&
                status !== NodeStatus.SKIPPED &&
                status !== NodeStatus.FAILED) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查是否有失败的节点
     * @returns {boolean}
     */
    hasFailed() {
        for (const status of this.nodeStatus.values()) {
            if (status === NodeStatus.FAILED) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取失败节点的错误信息
     * @returns {Array} 错误信息数组
     */
    getErrors() {
        const errors = [];
        for (const [nodeId, error] of this.nodeErrors) {
            if (error) {
                errors.push({
                    nodeId,
                    error: error.message || error,
                });
            }
        }
        return errors;
    }

    /**
     * 获取当前执行统计
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            skipped: 0,
        };

        for (const status of this.nodeStatus.values()) {
            stats[status]++;
        }

        return stats;
    }

    /**
     * 根据完成的上游节点更新下游节点状态
     * 当一个节点完成时，检查是否有下游节点可以就绪
     * @param {string} completedNodeId - 刚完成的节点ID
     */
    updateDownstream(completedNodeId) {
        const dependents = this._getDependents(completedNodeId);

        for (const dependentId of dependents) {
            const status = this.nodeStatus.get(dependentId);
            if (status === NodeStatus.PENDING) {
                // 检查是否所有依赖都已完成
                const deps = this._getDependencies(dependentId);
                const allDepsCompleted = deps.every(depId => {
                    const depStatus = this.nodeStatus.get(depId);
                    return depStatus === NodeStatus.COMPLETED;
                });

                if (allDepsCompleted) {
                    // 节点已就绪，不需要额外操作，getReadyNodes 会返回它
                }
            }
        }
    }

    /**
     * 获取已完成节点的结果 scope
     * @returns {Object} 合并后的 scope
     */
    getMergedScope() {
        let mergedScope = {};

        // 按拓扑排序顺序合并
        const sortedNodes = this._topologicalSort();
        for (const nodeId of sortedNodes) {
            const status = this.nodeStatus.get(nodeId);
            if (status === NodeStatus.COMPLETED) {
                const result = this.nodeResults.get(nodeId);
                if (result && result.scope) {
                    mergedScope = { ...mergedScope, ...result.scope };
                }
            }
        }

        return mergedScope;
    }

    /**
     * 拓扑排序（内部使用）
     * @private
     */
    _topologicalSort() {
        const inDegree = new Map();
        const adjacencyList = new Map();

        // 初始化
        for (const nodeId of Object.keys(this.nodes)) {
            inDegree.set(nodeId, 0);
            adjacencyList.set(nodeId, []);
        }

        // 构建邻接表和入度
        for (const edge of this.edges) {
            const from = edge.from;
            const to = edge.to;
            inDegree.set(to, (inDegree.get(to) || 0) + 1);
            adjacencyList.get(from).push(to);
        }

        // Kahn 算法
        const queue = [];
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) queue.push(nodeId);
        }

        const result = [];
        while (queue.length > 0) {
            const nodeId = queue.shift();
            result.push(nodeId);

            for (const neighbor of adjacencyList.get(nodeId)) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        return result;
    }
}