/**
 * DAG (有向无环图) 工具函数
 * 用于验证并行任务执行的依赖图
 */

/**
 * 验证DAG是否包含环
 * @param {Object} nodes - 节点对象，key为step_id
 * @param {Array} edges - 边数组，格式为 [{from, to}, ...]
 * @returns {Object} { valid: boolean, error?: string, cycle?: string[] }
 */
export function validateDAG(nodes, edges) {
    // 构建邻接表
    const adjacencyList = buildAdjacencyList(nodes, edges);

    // 使用DFS检测环
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    function dfs(nodeId) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const children = adjacencyList.get(nodeId) || [];

        for (const childId of children) {
            if (!visited.has(childId)) {
                const result = dfs(childId);
                if (result) return result;
            } else if (recursionStack.has(childId)) {
                // 发现环
                const cycleStart = path.indexOf(childId);
                const cycle = [...path.slice(cycleStart), childId];
                return {
                    valid: false,
                    error: `Circular dependency detected: ${cycle.join(' -> ')}`,
                    cycle
                };
            }
        }

        path.pop();
        recursionStack.delete(nodeId);
        return null;
    }

    for (const nodeId of Object.keys(nodes)) {
        if (!visited.has(nodeId)) {
            const result = dfs(nodeId);
            if (result) return result;
        }
    }

    return { valid: true };
}

/**
 * 构建邻接表
 * @param {Object} nodes - 节点对象
 * @param {Array} edges - 边数组
 * @returns {Map} 邻接表
 */
function buildAdjacencyList(nodes, edges) {
    const adjacencyList = new Map();

    // 初始化所有节点
    for (const nodeId of Object.keys(nodes)) {
        adjacencyList.set(nodeId, []);
    }

    // 添加边
    for (const edge of edges) {
        if (edge.from && edge.to) {
            const neighbors = adjacencyList.get(edge.from) || [];
            neighbors.push(edge.to);
            adjacencyList.set(edge.from, neighbors);
        }
    }

    return adjacencyList;
}

/**
 * 从节点的depends_on字段推断边
 * @param {Object} nodes - 节点对象
 * @returns {Array} 边数组
 */
export function inferEdges(nodes) {
    const edges = [];

    for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.depends_on && Array.isArray(node.depends_on)) {
            for (const dep of node.depends_on) {
                edges.push({ from: dep, to: nodeId });
            }
        }
    }

    return edges;
}

/**
 * 从outputs和变量引用推断边
 * @param {Object} nodes - 节点对象
 * @returns {Array} 边数组
 */
export function inferEdgesFromOutputs(nodes) {
    const edges = [];
    const outputToStep = new Map();

    // 建立 outputs -> step_id 的映射
    for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.outputs && Array.isArray(node.outputs)) {
            for (const output of node.outputs) {
                const steps = outputToStep.get(output) || [];
                steps.push(nodeId);
                outputToStep.set(output, steps);
            }
        }
    }

    // 检查每个节点的goal/rationale中引用的变量
    for (const [nodeId, node] of Object.entries(nodes)) {
        const content = `${node.goal || ''} ${node.rationale || ''} ${node.constraints || ''}`;
        const varMatches = content.match(/\$\{([^}]+)\}/g);

        if (varMatches) {
            const usedVars = varMatches.map(m => m.slice(2, -1)); // 去掉 ${ 和 }

            for (const varName of usedVars) {
                const producers = outputToStep.get(varName) || [];
                for (const producerId of producers) {
                    if (producerId !== nodeId) {
                        // 避免重复边
                        if (!edges.some(e => e.from === producerId && e.to === nodeId)) {
                            edges.push({ from: producerId, to: nodeId });
                        }
                    }
                }
            }
        }
    }

    return edges;
}

/**
 * 获取拓扑排序结果
 * @param {Object} nodes - 节点对象
 * @param {Array} edges - 边数组
 * @returns {Array|null} 排序后的节点ID数组，如果有环返回null
 */
export function topologicalSort(nodes, edges) {
    const adjacencyList = buildAdjacencyList(nodes, edges);

    // 计算入度
    const inDegree = new Map();
    for (const nodeId of Object.keys(nodes)) {
        inDegree.set(nodeId, 0);
    }

    for (const edge of edges) {
        if (edge.from && edge.to) {
            inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }
    }

    // 使用Kahn算法
    const queue = [];
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree === 0) {
            queue.push(nodeId);
        }
    }

    const result = [];

    while (queue.length > 0) {
        const nodeId = queue.shift();
        result.push(nodeId);

        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
            const newDegree = (inDegree.get(neighbor) || 1) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) {
                queue.push(neighbor);
            }
        }
    }

    // 如果有环，结果数量会少于节点数量
    if (result.length !== Object.keys(nodes).length) {
        return null;
    }

    return result;
}

/**
 * 获取可以并行执行的节点组
 * @param {Object} nodes - 节点对象
 * @param {Array} edges - 边数组
 * @returns {Array} 每批可以并行执行的节点数组
 */
export function getParallelBatches(nodes, edges) {
    const adjacencyList = buildAdjacencyList(nodes, edges);

    // 计算入度
    const inDegree = new Map();
    for (const nodeId of Object.keys(nodes)) {
        inDegree.set(nodeId, 0);
    }

    for (const edge of edges) {
        if (edge.from && edge.to) {
            inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }
    }

    const batches = [];
    const completed = new Set();

    while (completed.size < Object.keys(nodes).length) {
        // 找出所有入度为0的节点
        const readyNodes = [];
        for (const [nodeId, degree] of inDegree.entries()) {
            if (degree === 0 && !completed.has(nodeId)) {
                readyNodes.push(nodeId);
            }
        }

        if (readyNodes.length === 0) {
            // 如果没有就绪节点但未完成，说明有环
            break;
        }

        batches.push(readyNodes);

        // 标记这些节点完成，更新入度
        for (const nodeId of readyNodes) {
            completed.add(nodeId);
            const neighbors = adjacencyList.get(nodeId) || [];
            for (const neighbor of neighbors) {
                inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
            }
        }
    }

    return batches;
}