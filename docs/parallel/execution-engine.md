# 并行执行引擎设计

## 概述

并行执行引擎是实现任务并行执行的核心组件，负责调度任务、管理并发、控制执行流程。

## 模式选择

串行模式和并行模式通过配置共存，不删除原有代码：

```javascript
// src/index.js 或配置模块
import { getConfig } from './config.js';

const config = getConfig();

// 根据配置选择执行模式
if (config.useParallelExecution || process.argv.includes('--parallel') || process.argv.includes('-p')) {
  // 并行执行模式
  console.log('使用并行执行模式');
  import('./agents/orchestrator/parallel-executor.js').then(m => {
    const executor = new m.ParallelExecutionEngine(...);
    executor.execute();
  });
} else {
  // 串行执行模式（原有逻辑）
  console.log('使用串行执行模式');
  import('./agents/orchestrator/index.js').then(m => {
    const orchestrator = new m.AgentOrchestrator(...);
    orchestrator.run();
  });
}
```

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    ParallelExecutionEngine                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ DAGBuilder  │  │TaskScheduler│  │    ScopeCoordinator     │  │
│  │             │  │             │  │                         │  │
│  │ - parsePlan │  │ - getReady  │  │ - acquireLock(scopeKey)│  │
│  │ - buildDAG  │  │ - schedule  │  │ - releaseLock(scopeKey)│  │
│  │ - validate  │  │ - waitDeps  │  │ - mergeScopedUpdates   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   WorkerPool (p-limit)                      ││
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            ││
│  │  │Worker 1│  │Worker 2│  │Worker 3│  │Worker N│   max: 3  ││
│  │  │        │  │        │  │        │  │        │            ││
│  │  │Step A  │  │Step B  │  │Step C  │  │   -    │            ││
│  │  └────────┘  └────────┘  └────────┘  └────────┘            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     EventEmitter                            ││
│  │  step:started | step:completed | step:failed | dag:ready   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. DAGBuilder

负责将计划解析为 DAG 结构：

```typescript
class DAGBuilder {
  private nodes: Map<string, PlanNode> = new Map();
  private edges: Map<string, string[]> = new Map();

  /**
   * 从 JSON 计划构建 DAG
   */
  build(planJson: PlanJson): PlanGraph {
    // 1. 创建节点
    this.buildNodes(planJson.nodes || planJson.steps);

    // 2. 推断隐式依赖
    this.inferDependencies();

    // 3. 构建边
    this.buildEdges();

    // 4. 计算根节点和叶节点
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
   * 验证 DAG 无环（使用 DFS）
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
          console.error(`Circular dependency detected: ${nodeId} -> ${childId}`);
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

### 2. TaskScheduler

负责调度就绪任务：

```typescript
class TaskScheduler {
  private planGraph: PlanGraph;
  private pendingNodes: Set<string> = new Set();
  private runningNodes: Set<string> = new Set();
  private completedNodes: Set<string> = new Set();
  private failedNodes: Set<string> = new Set();

  constructor(planGraph: PlanGraph) {
    this.planGraph = planGraph;
    // 初始化所有节点为 pending
    for (const nodeId of planGraph.nodes.keys()) {
      this.pendingNodes.add(nodeId);
    }
  }

  /**
   * 获取所有可执行的节点（依赖已满足）
   */
  getReadyNodes(): PlanNode[] {
    const ready: PlanNode[] = [];

    for (const nodeId of this.pendingNodes) {
      const node = this.planGraph.nodes.get(nodeId)!;

      // 检查所有依赖是否已完成
      const allDepsCompleted = node.dependsOn.every(depId =>
        this.completedNodes.has(depId)
      );

      if (allDepsCompleted) {
        ready.push(node);
      }
    }

    return ready;
  }

  /**
   * 标记节点开始执行
   */
  markRunning(nodeId: string): void {
    this.pendingNodes.delete(nodeId);
    this.runningNodes.add(nodeId);
    this.planGraph.nodes.get(nodeId)!.status = 'running';
  }

  /**
   * 标记节点执行完成
   */
  markCompleted(nodeId: string, result: ExecutionResult): void {
    this.runningNodes.delete(nodeId);
    this.completedNodes.add(nodeId);
    const node = this.planGraph.nodes.get(nodeId)!;
    node.status = 'completed';
    node.result = result;
  }

  /**
   * 标记节点执行失败
   */
  markFailed(nodeId: string, error: Error): void {
    this.runningNodes.delete(nodeId);
    this.failedNodes.add(nodeId);
    const node = this.planGraph.nodes.get(nodeId)!;
    node.status = 'failed';
    node.result = { success: false, error: error.message };
  }

  /**
   * 检查是否所有节点都已完成
   */
  isComplete(): boolean {
    return this.pendingNodes.size === 0 &&
           this.runningNodes.size === 0 &&
           this.completedNodes.size + this.failedNodes.size === this.planGraph.nodes.size;
  }

  /**
   * 获取失败的节点数
   */
  getFailedCount(): number {
    return this.failedNodes.size;
  }
}
```

### 3. ScopeCoordinator

负责处理并发 scope 更新：

```typescript
class ScopeCoordinator {
  private locks: Map<string, Promise<void>> = new Map();
  private scope: { [key: string]: any };
  private scopeManager: ScopeManager;

  constructor(scopeManager: ScopeManager, initialScope: any) {
    this.scopeManager = scopeManager;
    this.scope = { ...initialScope };
  }

  /**
   * 获取特定 scope 变量的锁
   * 返回释放函数
   */
  async acquireLock(variableNames: string[]): Promise<() => void> {
    // 等待所有相关变量的现有锁释放
    const waitPromises = variableNames
      .filter(name => this.locks.has(name))
      .map(name => this.locks.get(name)!);

    if (waitPromises.length > 0) {
      await Promise.all(waitPromises);
    }

    // 创建新的锁
    let releaseFn: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseFn = resolve;
    });

    variableNames.forEach(name => {
      this.locks.set(name, lockPromise);
    });

    return () => {
      variableNames.forEach(name => this.locks.delete(name));
      releaseFn!();
    };
  }

  /**
   * 安全地合并 scope 更新
   */
  async mergeScopedUpdates(updates: { [key: string]: any }): Promise<void> {
    const variableNames = Object.keys(updates);
    const release = await this.acquireLock(variableNames);

    try {
      // 深度合并更新
      this.scope = this.deepMerge(this.scope, updates);

      // 持久化到文件
      await this.scopeManager.write(this.scope);
    } finally {
      release();
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 获取当前 scope
   */
  getScope(): { [key: string]: any } {
    return { ...this.scope };
  }
}
```

### 4. WorkerPool

使用 p-limit 控制并发数：

```typescript
import pLimit from 'p-limit';

class WorkerPool {
  private limit: ReturnType<typeof pLimit>;
  private maxParallel: number;

  constructor(maxParallel: number = 3) {
    this.maxParallel = maxParallel;
    this.limit = pLimit(maxParallel);
  }

  /**
   * 并行执行多个任务
   */
  async executeAll<T>(
    tasks: Array<() => Promise<T>>
  ): Promise<T[]> {
    const promises = tasks.map(task => this.limit(task));
    return await Promise.all(promises);
  }

  /**
   * 获取当前并发数
   */
  getActiveCount(): number {
    return this.limit.activeCount;
  }

  /**
   * 动态调整并发数
   */
  setMaxParallel(max: number): void {
    this.maxParallel = max;
    // p-limit 不支持动态调整，需要重新创建
    // 这里可以记录新值，在下次创建时生效
  }
}
```

## 并行执行引擎主类

### ParallelExecutionEngine

```typescript
class ParallelExecutionEngine {
  private planGraph: PlanGraph;
  private scheduler: TaskScheduler;
  private scopeCoordinator: ScopeCoordinator;
  private workerPool: WorkerPool;
  private executeAgent: ExecuteAgent;
  private eventEmitter: EventEmitter;
  private config: ExecutionConfig;

  constructor(
    planGraph: PlanGraph,
    executeAgent: ExecuteAgent,
    scopeManager: ScopeManager,
    config: ExecutionConfig = {}
  ) {
    this.planGraph = planGraph;
    this.executeAgent = executeAgent;
    this.scheduler = new TaskScheduler(planGraph);
    this.scopeCoordinator = new ScopeCoordinator(scopeManager, planGraph.scope);
    this.workerPool = new WorkerPool(config.maxParallel || 3);
    this.config = config;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * 执行所有任务
   */
  async execute(): Promise<Map<string, ExecutionResult>> {
    const results = new Map<string, ExecutionResult>();

    // 验证 DAG 无环
    const dagBuilder = new DAGBuilder();
    if (!dagBuilder.build(this.planGraph).validate()) {
      throw new Error('Plan contains circular dependencies');
    }

    // 主执行循环
    while (!this.scheduler.isComplete()) {
      // 获取所有就绪的节点
      const readyNodes = this.scheduler.getReadyNodes();

      if (readyNodes.length === 0) {
        // 没有就绪节点但未完成，可能有环或所有节点失败
        if (this.scheduler.getFailedCount() > 0) {
          throw new Error('Execution failed: some steps failed');
        }
        throw new Error('Deadlock detected: no ready nodes');
      }

      // 并行执行所有就绪的节点
      await this.executeReadyNodes(readyNodes, results);
    }

    return results;
  }

  /**
   * 执行就绪的节点
   */
  private async executeReadyNodes(
    readyNodes: PlanNode[],
    results: Map<string, ExecutionResult>
  ): Promise<void> {
    const tasks = readyNodes.map(node => async () => {
      try {
        // 标记开始执行
        this.scheduler.markRunning(node.id);
        this.eventEmitter.emit('step:started', { nodeId: node.id, step: node.step });

        // 获取当前 scope
        const currentScope = this.scopeCoordinator.getScope();

        // 执行步骤
        const result = await this.executeAgent.executeStep(currentScope, node.step);

        // 更新 scope
        if (result.updates) {
          await this.scopeCoordinator.mergeScopedUpdates(result.updates);
        }

        // 标记完成
        this.scheduler.markCompleted(node.id, result);
        results.set(node.id, result);
        this.eventEmitter.emit('step:completed', { nodeId: node.id, result });

        return result;
      } catch (error) {
        // 标记失败
        this.scheduler.markFailed(node.id, error as Error);
        results.set(node.id, { success: false, error: (error as Error).message });
        this.eventEmitter.emit('step:failed', { nodeId: node.id, error });

        // 根据配置决定是否继续
        if (!this.config.continueOnFailure) {
          throw error;
        }

        return { success: false, error: (error as Error).message };
      }
    });

    await this.workerPool.executeAll(tasks);
  }

  /**
   * 订阅事件
   */
  on(event: string, callback: Function): void {
    this.eventEmitter.on(event, callback);
  }
}
```

## 执行流程图

```
开始
  │
  ▼
构建 DAG
  │
  ▼
验证 DAG（检测环）
  │
  ▼
主循环
  │
  ├─▶ 获取就绪节点 ──▶ 并行执行 ──▶ 更新 Scope ──▶ 标记完成
  │        │                │
  │        │                ▼
  │        │            是否有更多就绪节点？
  │        │               │
  │        └───────────────┼───────────────┘
  │                        │
  ▼                        ▼
是否完成？ ──是──▶ 返回结果
  │
  否
  │
  ▼
检查死锁/失败 ──▶ 主循环
```

## 配置选项

```typescript
interface ExecutionConfig {
  maxParallel?: number;        // 最大并行数，默认 3
  continueOnFailure?: boolean; // 失败后是否继续执行，默认 false
  timeout?: number;            // 单个步骤超时时间（毫秒）
  onStepStart?: (nodeId: string, step: PlanNode) => void;
  onStepComplete?: (nodeId: string, result: ExecutionResult) => void;
  onStepFailed?: (nodeId: string, error: Error) => void;
}
```

## 事件列表

| 事件名 | 参数 | 说明 |
|--------|------|------|
| dag:ready | { graph: PlanGraph } | DAG 构建完成 |
| step:started | { nodeId: string, step: PlanNode } | 步骤开始执行 |
| step:completed | { nodeId: string, result: ExecutionResult } | 步骤执行完成 |
| step:failed | { nodeId: string, error: Error } | 步骤执行失败 |
| execution:complete | { results: Map<string, ExecutionResult> } | 所有步骤执行完成 |
| execution:error | { error: Error } | 执行出错 |

## 与现有系统的集成

### 在 AgentOrchestrator 中使用

```typescript
// 修改 AgentOrchestrator
async _executeWithParallel() {
  // 1. 构建 DAG
  const dagBuilder = new DAGBuilder();
  const planGraph = dagBuilder.build(this.workflowState.plan);

  // 2. 验证
  if (!planGraph) {
    throw new Error('Invalid plan graph');
  }

  // 3. 创建并行执行引擎
  const executor = new ParallelExecutionEngine(
    planGraph,
    this.executeAgent,
    this.scopeManager,
    {
      maxParallel: 3,
      continueOnFailure: false,
      onStepStart: (nodeId, step) => {
        this._emit('step:started', { nodeId, step });
      },
      onStepComplete: (nodeId, result) => {
        this._emit('step:completed', { nodeId, result });
      }
    }
  );

  // 4. 执行
  const results = await executor.execute();

  return results;
}
```