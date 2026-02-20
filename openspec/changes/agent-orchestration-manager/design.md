## Design: Agent Orchestration Manager

### Overview

设计一个中央协调器（AgentOrchestrator）来管理三个Agent的协作流程，实现端到端的自动化区块链交易分析。

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AgentOrchestrator                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Workflow   │  │   Global    │  │   Event     │  │   Review    │  │
│  │   Engine    │  │    State    │  │   Bus       │  │   Engine    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  QuestionAgent  │      │    PlanAgent    │      │  ExecuteAgent   │
│  (信息收集)      │      │  (计划+审查)     │      │  (执行分析)      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Components

#### 1. AgentOrchestrator

位置：`src/agents/orchestrator/index.js`

核心职责：
- 初始化和管理三个Agent实例
- 维护全局工作流状态
- 协调Agent间的数据流
- 处理用户输入和系统输出
- 管理生命周期事件

```javascript
class AgentOrchestrator {
  constructor(callLLM) {
    this.callLLM = callLLM;
    this.questionAgent = new QuestionAgent(callLLM);
    this.planAgent = new PlanAgent(callLLM);
    this.executeAgent = new ExecuteAgent(callLLM);

    // 工作流状态
    this.workflowState = {
      stage: 'idle',      // idle -> collecting -> planning -> executing -> completed
      scope: null,        // 全局共享状态
      plan: null,         // 执行计划
      currentStepIndex: 0,
      executionHistory: [],
      reviewResults: []
    };

    this.eventHandlers = new Map();
  }

  // 主入口
  async run(initialInput = null) { }

  // 阶段控制
  async collectRequirements(initialInput) { }
  async createPlan(infos) { }
  async executeWithReview() { }
  async reviewStepExecution(step, result) { }

  // 事件系统
  on(event, handler) { }
  emit(event, data) { }
}
```

#### 2. Workflow State Machine

工作流阶段转换：

```
┌─────┐    start     ┌─────────────┐   infos collected   ┌──────────┐
│idle │ ───────────► │ collecting  │ ─────────────────► │ planning │
└─────┘              └─────────────┘                     └──────────┘
                                                              │
                                                              ▼
┌────────┐  all steps done  ┌─────────────┐  no more steps  ┌───────────┐
│completed│ ◄─────────────── │  reviewing  │ ◄────────────── │ executing │
└────────┘                  └─────────────┘                 └───────────┘
     ▲                                                            │
     │                                                            │
     └─────────────────────────────────────────────────────────────┘
                            step execution
```

#### 3. Review Mechanism

每步执行后的审查流程：

```javascript
async reviewStepExecution(step, executionResult) {
  const reviewPrompt = `
你作为计划审查员，需要评估刚刚完成的执行步骤。

原始步骤:
${JSON.stringify(step, null, 2)}

执行结果:
${JSON.stringify(executionResult, null, 2)}

当前全局状态:
${JSON.stringify(this.workflowState.scope, null, 2)}

请分析并返回以下结构的JSON:
{
  "assessment": "success|partial|failure",  // 执行成功度
  "findings": "关键发现总结",
  "plan_adjustments": {
    "needs_modification": true|false,  // 是否需要修改计划
    "reason": "修改原因",
    "suggested_changes": "建议的具体修改"
  },
  "next_step_recommendation": "继续|修改后继续|暂停|终止"
}
`;

  const review = await this.callLLM({
    systemPrompt: reviewPrompt,
    modelProvider: "deepseek-reasoner"
  });

  return review;
}
```

### Data Flow

完整的数据流：

```
1. 启动阶段
   ┌─────────┐     ┌─────────────┐
   │  index  │────►│Orchestrator │
   │  .js    │     │ (init)      │
   └─────────┘     └─────────────┘

2. 信息收集阶段
   ┌─────────────┐    infos    ┌─────────────┐
   │Orchestrator │◄───────────►│QuestionAgent│
   │  (收集阶段)  │  questions  │ (ReAct模式) │
   └─────────────┘             └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   用户输入   │
                    └─────────────┘

3. 计划生成阶段
   ┌─────────────┐    infos    ┌─────────────┐
   │Orchestrator │◄───────────►│  PlanAgent  │
   │  (计划阶段)  │    plan    │(deepseek-  │
   └─────────────┘             │ reasoner)  │
                               └─────────────┘

4. 执行+审查循环
   ┌─────────────┐              ┌─────────────┐
   │Orchestrator │────────────►│ExecuteAgent │
   │ (执行阶段)   │  scope +   │  (ReAct模式) │
   │             │ currentStep │             │
   │             │◄────────────│             │
   │             │   result    │             │
   └──────┬──────┘             └─────────────┘
          │
          ▼
   ┌─────────────┐              ┌─────────────┐
   │  PlanAgent  │◄────────────►│Orchestrator │
   │  (Review)   │   review     │ (审查阶段)   │
   │             │────────────►│             │
   │             │  adjustments│             │
   └─────────────┘              └─────────────┘
          │
          ▼
   ┌─────────────┐
   │  下一步决定  │
   │ 继续/修改/终止│
   └─────────────┘

5. 完成阶段
   ┌─────────────┐              ┌─────────────┐
   │Orchestrator │────────────►│    用户     │
   │ (完成阶段)   │  final report│             │
   └─────────────┘              └─────────────┘
```

### File Structure

```
src/
├── index.js                           # 使用Orchestrator启动
├── services/
│   └── agent.js                       # LLM服务（已有）
└── agents/
    ├── orchestrator/                  # NEW: 中央协调器
    │   ├── index.js                   # Orchestrator主类
    │   ├── state-machine.js           # 工作流状态机
    │   └── events.js                # 事件系统
    ├── questionBot/
    │   ├── agent.js                   # 修改：适配Orchestrator
    │   └── prompt.js                  # 已有
    ├── planBot/
    │   ├── agent.js                   # 修改：新增reviewStep
    │   └── prompt.js                  # 已有
    └── executeBot/
        ├── agent.js                   # 已有
        ├── prompt.js                  # 已有
        └── skills/                    # 已有
```

### Integration Points

#### QuestionAgent 改造点

```javascript
// 新增方法，替代原有的 run() 方法
async collectRequirements(initialInput = null) {
  // 不再使用 readline.createInterface
  // 改为由外部（Orchestrator）传入初始输入
  // 通过 Promise 的方式返回收集到的 infos
  // 在需要用户输入时，通过回调/事件通知Orchestrator，然后等待响应
}
```

#### PlanAgent 改造点

```javascript
// 新增审查方法
async reviewStep(step, executionResult, currentScope) {
  // 评估执行结果
  // 决定是否需要调整计划
  // 返回审查结果和建议
}
```

#### ExecuteAgent 已有接口

ExecuteAgent 的 `executeStep(scope, currentStep)` 方法已经适合被 Orchestrator 调用。

### Error Handling

错误处理策略：

```
1. QuestionAgent 错误
   - 用户输入超时 → 重试3次后终止
   - LLM API 错误 → 指数退避重试

2. PlanAgent 错误
   - 计划生成失败 → 使用简化默认计划
   - Review 失败 → 跳过审查继续执行

3. ExecuteAgent 错误
   - Skill 执行失败 → 记录错误，尝试替代技能
   - Step 完全失败 → 标记为失败，询问PlanBot是否继续

4. Orchestrator 错误
   - 状态不一致 → 尝试从上一个checkpoint恢复
   - 不可恢复错误 → 优雅终止，保存当前状态
```

### Testing Strategy

测试策略：

1. **单元测试**
   - StateMachine: 测试所有状态转换
   - EventBus: 测试事件订阅/发布
   - Orchestrator: 使用 mock Agent 测试流程

2. **集成测试**
   - 端到端流程测试（使用 mock LLM）
   - 每个阶段的边界条件测试

3. **手动测试场景**
   - 正常流程：简单交易分析
   - 复杂流程：多步骤分析 + 计划调整
   - 错误恢复：某步骤失败后的重试
