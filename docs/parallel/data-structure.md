# 计划图数据结构设计

## 概述

本文档详细描述并行执行计划的数据结构设计，将原有线性数组结构改为 DAG（有向无环图）结构。

## 原有结构

```json
{
  "scope": {
    "tx_hash": "0xabc...",
    "sender_address": null,
    "receiver_address": null
  },
  "steps": [
    {
      "goal": "获取交易详情",
      "rationale": "需要获取交易基本信息",
      "success_criteria": ["tx_details 已获取"]
    },
    {
      "goal": "分析发送方行为",
      "rationale": "依赖交易详情",
      "success_criteria": ["sender_profile 已生成"]
    }
  ]
}
```

## 新的计划图结构

### PlanGraph 接口定义

```typescript
interface PlanGraph {
  scope: { [key: string]: any };     // 状态变量容器
  nodes: Map<string, PlanNode>;      // 节点映射：step_id -> 节点
  edges: Map<string, string[]>;      // 出边：step_id -> 依赖该节点的子节点列表
  rootNodes: string[];               // 根节点列表（无依赖）
  leafNodes: string[];               // 叶节点列表（无后继）
}
```

### PlanNode 节点定义

```typescript
interface PlanNode {
  id: string;                        // 唯一标识符（step_id）
  step: {
    goal: string;                    // 步骤目标
    rationale: string;               // 理由说明
    constraints?: string;            // 约束条件
    success_criteria: string[];      // 成功标准
    next_step_hint?: string;         // 下一步提示
  };
  status: NodeStatus;                // 节点状态
  dependsOn: string[];               // 依赖的节点 ID 列表
  outputs: string[];                 // 该步骤输出的 scope 变量名
  result?: ExecutionResult;          // 执行结果
  inDegree: number;                  // 入度（依赖数量）
  outDegree: number;                 // 出度（后继数量）
}

type NodeStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed';
```

### 新的 JSON 格式示例

```json
{
  "scope": {
    "tx_hash": "0xabc123...",
    "tx_details": null,
    "sender_profile": null,
    "receiver_profile": null,
    "intent_analysis": null
  },
  "nodes": {
    "step_1": {
      "goal": "获取交易详情",
      "rationale": "需要获取交易基本信息以进行后续分析",
      "success_criteria": ["tx_details 变量已填充"],
      "outputs": ["tx_details"],
      "status": "pending",
      "dependsOn": []
    },
    "step_2": {
      "goal": "分析发送方行为模式",
      "rationale": "基于交易详情分析发送方行为特征",
      "success_criteria": ["sender_profile 变量已填充"],
      "outputs": ["sender_profile"],
      "status": "pending",
      "dependsOn": ["step_1"]
    },
    "step_3": {
      "goal": "分析接收方行为模式",
      "rationale": "基于交易详情分析接收方行为特征",
      "success_criteria": ["receiver_profile 变量已填充"],
      "outputs": ["receiver_profile"],
      "status": "pending",
      "dependsOn": ["step_1"]
    },
    "step_4": {
      "goal": "综合分析交易意图",
      "rationale": "综合发送方和接收方分析结果，推断交易意图",
      "success_criteria": ["intent_analysis 变量已填充"],
      "outputs": ["intent_analysis"],
      "status": "pending",
      "dependsOn": ["step_2", "step_3"]
    }
  },
  "edges": [
    {"from": "step_1", "to": "step_2"},
    {"from": "step_1", "to": "step_3"},
    {"from": "step_2", "to": "step_4"},
    {"from": "step_3", "to": "step_4"}
  ],
  "rootNodes": ["step_1"],
  "leafNodes": ["step_4"]
}
```

## 依赖声明方式

### 显式依赖

通过节点的 `dependsOn` 字段显式声明依赖关系：

```json
{
  "step_3": {
    "goal": "分析接收方行为",
    "dependsOn": ["step_1"],
    "outputs": ["receiver_profile"]
  }
}
```

### 隐式依赖推断

系统可以根据 scope 变量引用自动推断依赖关系：

1. 解析每个步骤的 `goal` 和 `outputs`
2. 如果步骤 A 的 `outputs` 包含变量 X，而步骤 B 的 `goal` 引用了 `${X}`
3. 自动推断 B 依赖于 A

```typescript
function inferDependencies(nodes: Map<string, PlanNode>): void {
  for (const [nodeId, node] of nodes) {
    const outputVars = new Set(node.outputs || []);

    for (const [otherId, other] of nodes) {
      if (nodeId === otherId) continue;

      // 检查 other 是否引用了 node 输出的变量
      const goalVars = extractScopeVariables(other.step.goal);

      for (const varName of goalVars) {
        if (outputVars.has(varName) && !other.dependsOn.includes(nodeId)) {
          other.dependsOn.push(nodeId);
        }
      }
    }
  }
}
```

## 图的构建

### DAGBuilder 类

```typescript
class DAGBuilder {
  private nodes: Map<string, PlanNode> = new Map();
  private edges: Map<string, string[]> = new Map();

  /**
   * 从 JSON 计划构建 DAG
   */
  build(planJson: any): PlanGraph {
    // 1. 创建节点
    this.buildNodes(planJson.nodes);

    // 2. 构建边（依赖关系）
    this.buildEdges();

    // 3. 计算根节点和叶节点
    const rootNodes = this.findRootNodes();
    const leafNodes = this.findLeafNodes();

    return {
      scope: planJson.scope,
      nodes: this.nodes,
      edges: this.edges,
      rootNodes,
      leafNodes
    };
  }

  /**
   * 验证 DAG 无环
   */
  validate(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const children = this.edges.get(nodeId) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          if (dfs(childId)) return true;
        } else if (recursionStack.has(childId)) {
          // 发现环
          return false;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return false;
      }
    }

    return true;
  }
}
```

## 并行执行模式

### Fan-Out 模式

一个步骤为多个并行步骤准备数据：

```
step_1 (获取交易)
    │
    ├──────────┐
    ▼          ▼
step_2    step_3
(分析发送方) (分析接收方)
```

### Fan-In 模式

多个并行步骤汇聚到一个步骤：

```
step_2    step_3
(分析发送方) (分析接收方)
    │          │
    └──────────┘
         ▼
    step_4 (综合分析)
```

### 混合模式

```
        step_1 (获取交易)
            │
     ┌──────┼──────┐
     ▼      ▼      ▼
  step_2 step_3 step_4
   │      │      │
   └──────┼──────┘
          ▼
       step_5 (综合报告)
```

## 状态转换

### 节点状态机

```
  pending ──▶ ready ──▶ running ──▶ completed
                │                    │
                │                    ▼
                │                  failed
                │
                └──────────────────（重新执行）
```

### 状态说明

| 状态 | 说明 |
|------|------|
| pending | 等待执行，依赖未满足 |
| ready | 依赖已满足，可以执行 |
| running | 正在执行 |
| completed | 执行成功完成 |
| failed | 执行失败 |

## 与现有系统的兼容性

### 兼容层

为保持与现有系统的兼容，提供转换函数：

```typescript
/**
 * 将旧的 steps 数组转换为新的图结构
 */
function convertLegacyPlan(legacyPlan: { scope: any; steps: any[] }): PlanGraph {
  const nodes = new Map<string, PlanNode>();
  const edges = new Map<string, string[]>();

  // 将每个 step 转换为节点
  legacyPlan.steps.forEach((step, index) => {
    const nodeId = `step_${index + 1}`;
    nodes.set(nodeId, {
      id: nodeId,
      step,
      status: 'pending',
      dependsOn: [],
      outputs: [],
      inDegree: 0,
      outDegree: 0
    });
  });

  // 根据 next_step_hint 推断依赖关系
  legacyPlan.steps.forEach((step, index) => {
    if (index < legacyPlan.steps.length - 1) {
      const currentId = `step_${index + 1}`;
      const nextId = `step_${index + 2}`;
      addEdge(nodes, edges, currentId, nextId);
    }
  });

  return {
    scope: legacyPlan.scope,
    nodes,
    edges,
    rootNodes: ['step_1'],
    leafNodes: [`step_${legacyPlan.steps.length}`]
  };
}
```

这样可以在过渡期支持两种格式的計劃。