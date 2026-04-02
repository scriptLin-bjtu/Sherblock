# 实施步骤分解

## 概述

本文档将并行任务执行功能的实现分解为具体的实施步骤。

## 设计原则

**串行模式和并行模式共存，不删除原有代码。**

- 串行模式：保持原有逻辑不变，作为默认模式
- 并行模式：通过命令行参数或环境变量启用
- 两者代码共存，通过配置切换

## 启动方式

```bash
# 串行执行模式（默认，原有行为不变）
node src/index.js

# 并行执行模式
node src/index.js --parallel
# 或
node src/index.js -p

# 指定最大并行数
node src/index.js --parallel --max-parallel 5
# 或
node src/index.js -p -m 5

# 失败后继续执行
node src/index.js --parallel --continue-on-failure
# 或
node src/index.js -p -c

# 查看帮助
node src/index.js --help
# 或
node src/index.js -h
```

也可以通过环境变量控制：

```bash
# .env 文件
USE_PARALLEL_EXECUTION=true
MAX_PARALLEL_TASKS=3
CONTINUE_ON_FAILURE=true
```

## 阶段一：数据结构调整 ✅ 已完成

### 1.1 修改 PlanAgent Prompt ✅

**文件**: `src/agents/planBot/prompt.js`

**任务**:
1. 添加 `step_id` 生成规则（每个步骤的唯一标识符）
2. 添加 `depends_on` 字段定义（显式依赖声明）
3. 添加 `outputs` 字段定义（步骤输出变量）
4. 添加并行规划指南

**状态**: ✅ 已完成 - 在 STEP DESIGN RULES 中添加了 step_id、depends_on、outputs 字段定义，在 OUTPUT FORMAT 中添加了并行规划格式说明

### 1.2 修改 PlanAgent 输出解析 ✅

**文件**: `src/agents/planBot/agent.js`

**任务**:
1. 修改 JSON 解析逻辑，支持新的图格式
2. 添加默认的 `step_id` 生成
3. 添加 `outputs` 字段的默认值处理

**状态**: ✅ 已完成 - 添加了 parsePlanResponse 和 convertLegacyFormat 函数，支持新旧格式转换

### 1.3 添加 DAG 验证 ✅

**文件**: `src/utils/dag-utils.js`

**任务**:
1. 实现 DAG 环检测算法
2. 在计划生成后添加验证
3. 提供验证错误信息

**状态**: ✅ 已完成 - 新建 dag-utils.js，实现了 validateDAG、inferEdges、topologicalSort、getParallelBatches 等函数

## 阶段二：并行执行引擎实现 ✅ 已完成

### 2.1 创建 DAGBuilder ✅

**文件**: `src/agents/orchestrator/dag-builder.js`

**任务**:
1. 实现 DAGBuilder 类 ✅
2. 实现依赖推断逻辑 ✅
3. 实现根节点/叶节点计算 ✅

**状态**: ✅ 已完成 - 新建 dag-builder.js，实现了从 plan 构建 DAG、依赖推断、根节点/叶节点计算

### 2.2 创建 TaskScheduler ✅

**文件**: `src/agents/orchestrator/task-scheduler.js`

**任务**:
1. 实现节点状态管理 ✅
2. 实现就绪节点计算 ✅
3. 实现完成/失败状态更新 ✅

**状态**: ✅ 已完成 - 新建 task-scheduler.js，实现了节点状态管理、就绪节点计算、完成/失败状态更新

### 2.3 创建 ScopeCoordinator ✅

**文件**: `src/agents/orchestrator/scope-coordinator.js`

**任务**:
1. 实现锁机制 ✅
2. 实现安全的 scope 合并 ✅
3. 与 ScopeManager 集成 ✅

**状态**: ✅ 已完成 - 新建 scope-coordinator.js，实现了字段级锁机制、安全的 scope 读写

### 2.4 创建 ParallelExecutionEngine ✅

**文件**: `src/agents/orchestrator/parallel-executor.js`

**任务**:
1. 实现主执行循环 ✅
2. 实现 p-limit 并发控制 ✅
3. 实现事件发射 ✅

**状态**: ✅ 已完成 - 新建 parallel-executor.js，实现了 DAG 执行循环、p-limit 并发控制、事件回调

### 2.5 安装 p-limit ✅

```bash
npm install p-limit
```

**状态**: ✅ 已完成 - 已安装 p-limit@^4.0.0

## 阶段三：修改 AgentOrchestrator ✅ 已完成

### 3.1 添加并行执行方法 ✅

**文件**: `src/agents/orchestrator/index.js`

**实现内容**:
1. ✅ 添加 `_executeWithDAG()` 方法
2. ✅ 保留原有 `_executeWithReview()` 方法（用于兼容）
3. ✅ 添加配置选项控制使用串行还是并行执行
4. ✅ 添加 DAG 验证和依赖推断

**实现细节**:

```javascript
// 添加 imports
import { validateDAG, inferEdges, inferEdgesFromOutputs } from "../../utils/dag-utils.js";
import { ParallelExecutionEngine } from "./parallel-executor.js";

// 在 constructor 中添加配置
this.config = {
    useParallelExecution: options.useParallelExecution || process.env.USE_PARALLEL_EXECUTION === 'true',
    maxParallelTasks: options.maxParallelTasks || parseInt(process.env.MAX_PARALLEL_TASKS, 10) || 3,
    continueOnFailure: options.continueOnFailure ?? process.env.CONTINUE_ON_FAILURE === 'true' ?? false,
};

// 添加 _executeWithDAG 方法
async _executeWithDAG() {
    // 构建节点对象
    // 推断边（显式依赖 + 变量引用推断）
    // 验证 DAG
    // 创建并行执行引擎并执行
}

// 在 run() 方法中选择执行模式
if (this.config.useParallelExecution) {
    await this.stateMachine.transition(WorkflowStage.EXECUTING, {...});
    result = await this._executeWithDAG();
} else {
    result = await this._executeWithReview();
}
```

**状态**: ✅ 已完成 - 实现了 DAG 执行引擎集成、依赖推断、DAG 验证、事件发射

### 3.2 添加命令行参数解析 ✅

**文件**: `src/index.js`

**实现内容**:
1. ✅ 解析 `--parallel` / `-p` 启用并行模式
2. ✅ 解析 `--max-parallel` / `-m` 设置最大并行数
3. ✅ 解析 `--continue-on-failure` / `-c` 失败后继续
4. ✅ 添加 `--help` / `-h` 帮助信息

**状态**: ✅ 已完成 - 支持命令行参数和环境变量配置

## 阶段四：审查流程适配 ✅ 已完成

### 4.1 修改审查逻辑

**任务**:
1. 审查结果需要更新 DAG 结构 ✅
2. 处理添加/删除/重新排序步骤对 DAG 的影响 ✅

**实现内容**:

#### 4.1.1 ParallelExecutionEngine 审查支持

**文件**: `src/agents/orchestrator/parallel-executor.js`

**新增功能**:
1. 添加审查配置选项 (`enableReview`, `reviewCallback`, `planAgent`)
2. 步骤完成后立即调用审查回调
3. 处理 `MODIFY_PLAN` / `REORDER` 决策时返回重建标记
4. 添加 `_callReview()` 方法支持自定义回调和 PlanAgent 审查
5. 添加 `setReviewCallback()`, `setPlanAgent()`, `setReviewEnabled()` 动态配置方法

```javascript
// 审查模式配置
constructor(plan, executeAgent, scopeManager, options = {}) {
    this.options = {
        // ... 其他配置
        enableReview: options.enableReview ?? false,
        reviewCallback: options.reviewCallback || null,
        planAgent: options.planAgent || null,
    };
}

// 步骤完成后审查
if (this.reviewEnabled && this.reviewCallback) {
    const reviewResult = await this._callReview(node, result, currentScope);

    if (reviewResult.decision === 'MODIFY_PLAN' ||
        reviewResult.decision === 'REORDER') {
        return { needsDAGRebuild: true, reviewResult, ... };
    }
}
```

#### 4.1.2 AgentOrchestrator 审查集成

**文件**: `src/agents/orchestrator/index.js`

**新增功能**:
1. 添加 `enableReview` 配置项（支持环境变量 `ENABLE_REVIEW_IN_PARALLEL`）
2. 在 `_executeWithDAG()` 中集成审查模式
3. 实现审查后的 DAG 重建循环（最多 5 次重建防止无限循环）
4. 支持 `MODIFY_PLAN`、`REORDER` 决策的处理

**配置方式**:

```bash
# 环境变量
ENABLE_REVIEW_IN_PARALLEL=true
```

```javascript
// 或在代码中配置
const orchestrator = new AgentOrchestrator(callLLM, {
    useParallelExecution: true,
    enableReview: true,  // 启用并行模式下的审查
});
```

**审查决策处理流程**:
1. 步骤执行完成后，调用 PlanAgent 进行审查
2. 审查结果返回 `decision`：
   - `CONTINUE`: 继续执行剩余步骤
   - `MODIFY_PLAN`: 根据 adjustments 修改计划，重建 DAG
   - `REORDER`: 根据 newOrder 重新排序步骤，重建 DAG
   - `TERMINATE`: 终止执行
3. 如果需要重建 DAG：
   - 调用 `planAgent.adjustPlan()` 或 `planAgent.reorderRemainingSteps()`
   - 重新构建节点和边
   - 验证新 DAG 有效性
   - 创建新的执行器继续执行

**状态**: ✅ 已完成 - 支持并行模式下的步骤审查和计划动态调整

## 阶段五：测试和验证 ✅ 已完成

### 5.1 单元测试 ✅ 已完成

**测试内容**:
1. ✅ DAG 环检测 - `src/utils/__tests__/dag-utils.test.js`
2. ✅ 依赖推断 - 同上
3. ✅ 任务调度 - `src/agents/orchestrator/__tests__/task-scheduler.test.js`
4. ✅ Scope 锁机制 - `src/agents/orchestrator/__tests__/scope-coordinator.test.js`
5. ✅ DAG 构建 - `src/agents/orchestrator/__tests__/dag-builder.test.js`

**运行测试**:
```bash
npm run test:unit
# 或
npx vitest run
```

**测试结果**: 80 个测试全部通过

### 5.2 集成测试 ✅ 已完成

**测试场景**:
1. ✅ 完全独立的步骤并行执行
2. ✅ 有依赖关系的步骤按序执行
3. ✅ 混合依赖场景
4. ✅ 失败处理
5. ✅ 审查后计划调整

**测试文件**: `src/agents/orchestrator/__tests__/parallel-executor.test.js`

### 5.3 性能测试

**测试内容**:
1. 不同并发数的执行时间对比
2. Scope 锁竞争情况
3. 内存使用情况

**注意**: 性能测试需要在实际环境中运行，可以手动执行以下命令对比：

```bash
# 串行模式
node src/index.js

# 并行模式（3个并发）
node src/index.js --parallel --max-parallel 3

# 并行模式（5个并发）
node src/index.js --parallel --max-parallel 5
```

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/agents/planBot/prompt.js` | 修改 | 添加依赖声明支持（兼容旧格式） |
| `src/agents/planBot/agent.js` | 修改 | 支持新格式输出（保留原解析逻辑） |
| `src/utils/dag-utils.js` | 新建 | DAG 工具函数 |
| `src/agents/orchestrator/dag-builder.js` | 新建 | DAG 构建器 |
| `src/agents/orchestrator/task-scheduler.js` | 新建 | 任务调度器 |
| `src/agents/orchestrator/scope-coordinator.js` | 新建 | Scope 协调器 |
| `src/agents/orchestrator/parallel-executor.js` | 新建 | 并行执行引擎 |
| `src/agents/orchestrator/index.js` | 修改 | 集成并行执行（保留原 `_executeWithReview` 方法） |
| `src/index.js` | 修改 | 添加命令行参数解析 |

**重要：所有原有代码保持不变，只添加不删除。**

## 测试文件清单

| 测试文件 | 说明 | 测试数量 |
|----------|------|----------|
| `src/utils/__tests__/dag-utils.test.js` | DAG 工具函数测试 | 24 |
| `src/agents/orchestrator/__tests__/task-scheduler.test.js` | 任务调度器测试 | 17 |
| `src/agents/orchestrator/__tests__/scope-coordinator.test.js` | Scope 协调器测试 | 12 |
| `src/agents/orchestrator/__tests__/dag-builder.test.js` | DAG 构建器测试 | 13 |
| `src/agents/orchestrator/__tests__/parallel-executor.test.js` | 并行执行引擎测试 | 14 |
| **总计** | | **80** |

**运行所有测试**:
```bash
npm run test:unit
```

**运行单个测试文件**:
```bash
npx vitest run src/utils/__tests__/dag-utils.test.js
```

## 配置文件修改

在 `.env` 或配置文件中添加：

```bash
# 并行执行配置
MAX_PARALLEL_TASKS=3
USE_PARALLEL_EXECUTION=true
CONTINUE_ON_FAILURE=false
# 启用并行模式下的审查（可选）
ENABLE_REVIEW_IN_PARALLEL=true

# 测试框架（开发依赖）
# vitest 已自动安装
```

## 渐进迁移策略

1. **第一阶段**: 默认使用串行执行，添加配置开关
2. **第二阶段**: 启用并行执行，监控执行情况
3. **第三阶段**: 根据实际情况调整默认并发数

## 回滚方案

如果并行执行出现问题，可以通过设置环境变量回退到串行执行：

```bash
USE_PARALLEL_EXECUTION=false
```

这样可以在不影响用户的情况下进行功能迭代。