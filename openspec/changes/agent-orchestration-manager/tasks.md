## Tasks: Agent Orchestration Manager Implementation

### Critical Path

以下任务必须按顺序完成，因为它们有依赖关系：

1. **Setup** → **QuestionAgent改造** → **Orchestrator核心** → **集成测试**
2. **PlanAgent改造** 可以与上述并行，但 **审查机制集成** 依赖于两者

### Tasks

#### Phase 1: Foundation (Setup)

---

**[1.1] 创建 Orchestrator 目录结构**

- [x] 创建 `src/agents/orchestrator/` 目录
- [x] 创建 `src/agents/orchestrator/index.js` (主入口)
- [x] 创建 `src/agents/orchestrator/state-machine.js`
- [x] 创建 `src/agents/orchestrator/events.js`

验证：目录结构存在且文件可导入

---

#### Phase 2: QuestionAgent 改造

---

**[2.1] 重构 QuestionAgent 移除独立运行模式**

- [x] 删除 `run()` 方法中的 readline 循环逻辑
- [x] 移除 `this.rl` 的初始化
- [x] 移除 `process.exit(0)` 调用
- [x] 保留 ReAct 核心逻辑（`react()` 和 `executeAction()`）

验证：QuestionAgent 可以实例化但不自动启动交互循环

---

**[2.2] 实现 collectRequirements 驱动式接口**

- [x] 实现 `async collectRequirements(initialInput, options)` 方法
- [x] 支持通过 `options.onQuestion` 回调获取用户输入
- [x] 支持通过 `options.eventEmitter` 触发问题事件
- [x] 内部维护一个 Promise 队列处理用户输入
- [x] 当需要用户输入时暂停 ReAct 循环，等待外部提供输入

验证：
```javascript
const qa = new QuestionAgent(callLLM);
const infos = await qa.collectRequirements("分析这个交易", {
  onQuestion: async (q) => {
    console.log("问题:", q);
    return await getUserInput(); // 从某处获取用户输入
  }
});
```

---

**[2.3] 添加进度和状态查询方法**

- [x] 实现 `isComplete(): boolean` 方法
- [x] 实现 `getProgress(): ProgressInfo` 方法
- [x] ProgressInfo 包含：totalFields, filledFields, isRichEnough

验证：可以在任何时刻查询收集进度

---

#### Phase 3: PlanAgent 改造

---

**[3.1] 实现 reviewStep 审查方法**

- [x] 实现 `async reviewStep(step, executionResult, currentScope, currentPlan)` 方法
- [x] 使用 deepseek-reasoner 模型
- [x] 构建审查专用 prompt，包含：
  - 原始步骤定义
  - 执行结果详情
  - 当前全局状态
  - 原始计划的上下文
- [x] 解析 LLM 返回的审查结果
- [x] 返回结构化的 ReviewResult

验证：可以用 mock 数据测试审查功能

---

**[3.2] 实现 adjustPlan 计划调整方法**

- [x] 实现 `adjustPlan(plan, adjustments): ExecutionPlan` 方法
- [x] 支持 add 操作：在指定位置添加新步骤
- [x] 支持 modify 操作：修改现有步骤内容
- [x] 支持 remove 操作：标记步骤为 removed
- [x] 支持 reorder 操作：重新排序剩余步骤
- [x] 保持步骤索引的连续性和一致性

验证：可以应用各种类型的调整并验证结果

---

**[3.3] 实现 reorderRemainingSteps 方法**

- [x] 实现 `reorderRemainingSteps(plan, newOrder): ExecutionPlan` 方法
- [x] 只重新排序当前步骤索引之后的步骤
- [x] 保持已完成步骤的顺序不变
- [x] 验证 newOrder 的有效性

验证：可以正确重新排序剩余步骤

---

#### Phase 4: Orchestrator 核心实现

---

**[4.1] 实现事件系统 (events.js)**

- [x] 实现 `EventBus` 类
- [x] 支持 `on(event, handler)` 订阅事件
- [x] 支持 `off(event, handler)` 取消订阅
- [x] 支持 `emit(event, data)` 触发事件
- [x] 支持 `once(event, handler)` 一次性订阅
- [x] 实现命名空间支持（可选）

验证：可以订阅、触发和取消事件

---

**[4.2] 实现状态机 (state-machine.js)**

- [x] 实现 `WorkflowStateMachine` 类
- [x] 定义所有状态和有效转换（见设计文档）
- [x] 实现 `transition(to, context)` 方法
- [x] 实现 `canTransition(to)` 方法
- [x] 实现钩子系统（before/after/enter/leave）
- [x] 实现 `getValidTransitions()` 方法
- [x] 实现 `reset()` 方法

验证：
- 只能进行有效的状态转换
- 钩子在正确的时机被调用
- 无效转换返回 false 并记录错误

---

**[4.3] 实现 Orchestrator 核心类 (index.js)**

- [x] 实现 `AgentOrchestrator` 类
- [x] 构造函数初始化三个 Agent 和状态
- [x] 实现 `run(initialInput)` 主入口方法
- [x] 实现 `collectRequirements(initialInput)` 方法
- [x] 实现 `createPlan(infos)` 方法
- [x] 实现 `executeWithReview()` 方法（执行+审查循环）
- [x] 实现 `executeSingleStep(step)` 方法
- [x] 实现 `reviewStepExecution(step, result)` 方法
- [x] 实现事件委托（从 EventBus 代理）
- [x] 实现 `getState()` 方法
- [x] 实现 `pause/resume/stop` 生命周期控制

验证：
- 可以完成完整的端到端流程（使用 mock）
- 事件在正确的时机触发
- 状态转换正确

---

#### Phase 5: 集成与测试

---

**[5.1] 更新 index.js 使用 Orchestrator**

- [x] 修改 `src/index.js`
- [x] 导入 `AgentOrchestrator`
- [x] 创建 Orchestrator 实例
- [x] 设置事件监听（日志、进度显示）
- [x] 调用 `orchestrator.run()`
- [x] 添加错误处理
- [x] 添加优雅关闭处理

验证：应用程序可以通过 `npm start` 启动并运行完整流程

---

**[5.2] 创建集成测试**

- [x] 创建 `tests/orchestrator/` 目录
- [x] 创建 `orchestrator.test.js` - Orchestrator 核心测试
- [x] 创建 `state-machine.test.js` - 状态机测试
- [x] 创建 `integration.test.js` - 端到端集成测试
- [x] 使用 mock LLM 服务进行测试

测试覆盖：
- 正常流程（信息收集 → 计划 → 执行 → 完成）
- 计划调整流程（执行后需要修改计划）
- 错误恢复（某步骤失败后重试）
- 状态转换边界条件

---

**[5.3] 编写文档**

- [x] 更新 `CLAUDE.md` 添加 Orchestrator 架构说明
- [x] 创建 `docs/orchestrator/README.md`
- [x] 创建 `docs/orchestrator/workflow.md` - 工作流详细说明
- [x] 创建 `docs/orchestrator/api.md` - API 文档

---

### Task Dependencies

```
[1.1] Setup
    │
    ├──→ [2.1] [2.2] [2.3] ──→ QuestionAgent 改造完成
    │
    ├──→ [3.1] [3.2] [3.3] ──→ PlanAgent 改造完成
    │
    └──→ [4.1] [4.2] [4.3] ──→ Orchestrator 核心完成
                                  │
                                  ├──→ [5.1] 集成
                                  │
                                  ├──→ [5.2] 测试
                                  │
                                  └──→ [5.3] 文档
```

### Success Criteria

- [x] 所有单元测试通过
- [x] 集成测试覆盖主要使用场景
- [x] 端到端流程可以在 5 分钟内完成一个简单的交易分析
- [x] 代码通过 lint 检查
- [x] 文档完整且准确
