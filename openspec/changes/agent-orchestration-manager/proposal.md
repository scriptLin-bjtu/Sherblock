## Why

当前的区块链交易分析系统由三个独立的Agent组成（QuestionBot、PlanBot、ExecuteBot），但它们之间是割裂的，缺乏一个统一的管理模块来协调它们的工作流程。用户需要手动驱动每个Agent，无法实现端到端的自动化分析流程。需要一个中央协调器来管理Agent间的数据流、状态同步和任务调度。

## What Changes

- **新增 AgentOrchestrator 模块**：位于 `src/agents/orchestrator/`，作为系统的中央协调器
- **重构 index.js**：从简单的启动脚本转变为使用 Orchestrator 管理整个生命周期
- **新增状态管理**：在 Orchestrator 中维护跨 Agent 的全局状态（workflow state、scope、execution context）
- **新增 review 机制**：每步执行后由 PlanBot 审查执行结果，决定是否调整计划
- **新增工作流事件系统**：Orchestrator 发送事件（step_start, step_complete, review_required 等）
- **QuestionBot 改造**：移除独立的 readline 循环，改为由 Orchestrator 驱动的交互模式
- **PlanBot 改造**：新增 `reviewStep` 方法用于审查执行结果和决定计划调整

## Capabilities

### New Capabilities
- `agent-orchestrator`: 中央协调器，管理三个Agent的工作流程和数据流
- `workflow-state-machine`: 工作流状态机，定义和管理分析流程的各个阶段
- `plan-review`: 计划审查机制，每步执行后评估是否需要调整计划

### Modified Capabilities
- `question-bot`: 从独立运行改为由Orchestrator驱动的交互模式
- `plan-bot`: 新增reviewStep方法，支持执行结果的审查

## Impact

- **API Changes**: QuestionBot.run() 被弃用，改为 QuestionBot.collectRequirements() 返回 Promise
- **State Management**: 新增全局 workflowState 对象，包含 stage、scope、currentStepIndex、executionHistory
- **Dependencies**: 无新增外部依赖，使用现有 LLM 服务
- **Breaking**: 旧的独立运行模式不再支持，必须通过 Orchestrator 启动
