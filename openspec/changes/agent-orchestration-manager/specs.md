## Specifications

### New Capabilities

#### spec: agent-orchestrator

**REQUIREMENTS**

1. **Lifecycle Management**
   - MUST initialize all three agents (QuestionAgent, PlanAgent, ExecuteAgent) on startup
   - MUST manage the complete workflow from requirement collection to execution completion
   - MUST handle graceful shutdown and cleanup on completion or error

2. **State Management**
   - MUST maintain a global `workflowState` object containing:
     - `stage`: current stage (idle|collecting|planning|executing|reviewing|completed)
     - `scope`: shared data across agents
     - `plan`: the execution plan with steps
     - `currentStepIndex`: index of the current executing step
     - `executionHistory`: array of completed step results
     - `reviewResults`: array of plan review results

3. **Data Flow Coordination**
   - MUST pass `infos` from QuestionAgent to PlanAgent
   - MUST pass `scope` and `currentStep` from Orchestrator to ExecuteAgent
   - MUST update `scope` after each step execution
   - MUST pass execution results to PlanAgent for review

4. **Review Loop Integration**
   - MUST call PlanAgent.reviewStep() after each step execution
   - MUST handle plan adjustments based on review results
   - MUST support continuing, modifying, or terminating the workflow based on review

5. **Event System**
   - MUST emit events at key lifecycle points:
     - `workflow:started`
     - `stage:changed` (with { from, to })
     - `step:started` (with { stepIndex, step })
     - `step:completed` (with { stepIndex, result })
     - `review:started`
     - `review:completed` (with { decision, adjustments })
     - `workflow:completed` / `workflow:error`

**INTERFACE**

```typescript
class AgentOrchestrator {
  constructor(callLLM: LLMFunction)

  // Main entry point
  async run(initialInput?: string): Promise<WorkflowResult>

  // Event handling
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void

  // State access
  getState(): WorkflowState

  // Lifecycle control
  pause(): void
  resume(): void
  stop(): void
}

type WorkflowState = {
  stage: WorkflowStage
  scope: Record<string, any>
  plan: ExecutionPlan | null
  currentStepIndex: number
  executionHistory: StepResult[]
  reviewResults: ReviewResult[]
}

type WorkflowStage =
  | 'idle'
  | 'collecting'
  | 'planning'
  | 'executing'
  | 'reviewing'
  | 'completed'
```

---

#### spec: workflow-state-machine

**REQUIREMENTS**

1. **State Definitions**
   - `idle`: 初始状态，等待启动
   - `collecting`: QuestionAgent 正在收集用户需求
   - `planning`: PlanAgent 正在生成分析计划
   - `executing`: ExecuteAgent 正在执行当前步骤
   - `reviewing`: PlanAgent 正在审查执行结果
   - `completed`: 所有步骤执行完成

2. **Valid Transitions**
   - `idle` → `collecting` (启动工作流)
   - `collecting` → `planning` (信息收集完成)
   - `planning` → `executing` (计划生成完成)
   - `executing` → `reviewing` (步骤执行完成)
   - `reviewing` → `executing` (继续下一步)
   - `reviewing` → `planning` (需要修改计划)
   - `reviewing` → `completed` (所有步骤完成)
   - Any → `idle` (错误恢复或重置)

3. **Transition Guards**
   - 进入 `planning` 前必须有完整的 `infos` 对象
   - 进入 `executing` 前必须有有效的 `plan` 和 `scope`
   - 进入 `reviewing` 前必须有 `stepResult`
   - 进入 `completed` 前必须完成所有步骤

4. **Hook System**
   - `onBeforeTransition(from, to, context)`: 返回 false 可阻止转换
   - `onAfterTransition(from, to, context)`: 转换完成后执行
   - `onEnterState(state, context)`: 进入状态时执行
   - `onLeaveState(state, context)`: 离开状态时执行

**INTERFACE**

```typescript
class WorkflowStateMachine {
  constructor(initialState?: WorkflowStage)

  // Current state
  getState(): WorkflowStage

  // Check if transition is valid
  canTransition(to: WorkflowStage): boolean

  // Perform transition
  async transition(to: WorkflowStage, context?: any): Promise<boolean>

  // Hook registration
  beforeTransition(handler: TransitionHandler): void
  afterTransition(handler: TransitionHandler): void
  onEnterState(state: WorkflowStage, handler: StateHandler): void
  onLeaveState(state: WorkflowStage, handler: StateHandler): void

  // Get valid transitions from current state
  getValidTransitions(): WorkflowStage[]

  // Reset to idle
  reset(): void
}

type TransitionHandler = (from: WorkflowStage, to: WorkflowStage, context: any) => Promise<boolean | void>
type StateHandler = (state: WorkflowStage, context: any) => Promise<void>
```

---

#### spec: plan-review

**REQUIREMENTS**

1. **Review Trigger Conditions**
   - ExecuteAgent 完成一个步骤后自动触发
   - 步骤执行失败或异常时强制触发
   - 发现意外情况时手动触发

2. **Review Content**
   - 步骤执行结果评估（成功/部分成功/失败）
   - 发现的新信息分析
   - 原计划假设的验证
   - 剩余步骤的有效性检查
   - 风险评估

3. **Review Decision Types**
   - `CONTINUE`: 继续执行下一步
   - `MODIFY_PLAN`: 需要修改计划，然后继续
   - `ADD_STEPS`: 添加新步骤到计划
   - `REMOVE_STEPS`: 删除某些步骤
   - `REORDER`: 重新排序剩余步骤
   - `TERMINATE`: 终止工作流（发现重大问题或已完成）

4. **Adjustment Application**
   - 新增步骤自动分配索引
   - 修改步骤保持原有索引但更新内容
   - 删除步骤标记为 removed 但不物理删除（保留历史）
   - 重新排序更新所有受影响步骤的索引

5. **Review History**
   - 记录每次审查的完整信息
   - 支持审查链的回溯
   - 用于后续分析和优化

**INTERFACE**

```typescript
class PlanReviewEngine {
  constructor(planAgent: PlanAgent)

  // Review a completed step
  async reviewStep(
    step: ExecutionStep,
    executionResult: StepResult,
    currentPlan: ExecutionPlan,
    globalScope: Record<string, any>
  ): Promise<ReviewResult>

  // Apply adjustments to plan
  applyAdjustments(
    plan: ExecutionPlan,
    adjustments: PlanAdjustment[]
  ): ExecutionPlan

  // Get review history
  getReviewHistory(): ReviewRecord[]

  // Get latest review
  getLatestReview(): ReviewRecord | null
}

type ReviewResult = {
  assessment: 'success' | 'partial' | 'failure'
  findings: string
  decision: ReviewDecision
  adjustments: PlanAdjustment[]
  reason: string
  nextStepRecommendation: 'continue' | 'modify_then_continue' | 'pause' | 'terminate'
}

type ReviewDecision =
  | 'CONTINUE'
  | 'MODIFY_PLAN'
  | 'ADD_STEPS'
  | 'REMOVE_STEPS'
  | 'REORDER'
  | 'TERMINATE'

type PlanAdjustment = {
  type: 'add' | 'modify' | 'remove' | 'reorder'
  stepIndex?: number
  step?: ExecutionStep
  newOrder?: number[]
}

type ReviewRecord = {
  id: string
  timestamp: number
  stepIndex: number
  result: ReviewResult
  planVersion: number
}
```

### Modified Capabilities

#### spec: question-bot (delta)

**REQUIREMENT CHANGES**

1. **移除独立运行模式**
   - 删除 `run()` 方法中的独立 readline 循环
   - 移除进程退出处理 `process.exit(0)`

2. **新增驱动式接口**
   - 新增 `collectRequirements(initialInput?): Promise<Infos>` 方法
   - ReAct 循环仍然内部运行，但用户输入通过回调/事件获取
   - 当需要用户输入时，抛出特定事件，等待外部提供输入

3. **事件集成**
   - 支持 `onQuestion(question): Promise<answer>` 回调
   - 或支持 EventEmitter 模式 `emit('question', question)`

**INTERFACE CHANGES**

```typescript
class QuestionAgent {
  // 原有方法保留
  constructor(callLLM: LLMFunction)
  getinfos(): Infos

  // REMOVED: run(): void  - 删除独立运行模式

  // NEW: 驱动式收集方法
  async collectRequirements(
    initialInput?: string,
    options?: {
      onQuestion?: (question: string) => Promise<string>
      eventEmitter?: EventEmitter
    }
  ): Promise<Infos>

  // NEW: 检查是否完成
  isComplete(): boolean

  // NEW: 获取当前进度
  getProgress(): {
    totalFields: number
    filledFields: number
    isRichEnough: boolean
  }
}
```

---

#### spec: plan-bot (delta)

**REQUIREMENT CHANGES**

1. **保留现有 makePlan 功能**
   - `makePlan(infos): Promise<ExecutionPlan>` 保持不变

2. **新增步骤审查功能**
   - 新增 `reviewStep(step, result, scope): Promise<ReviewResult>` 方法
   - 使用 deepseek-reasoner 模型进行深度审查
   - 支持返回计划调整建议

3. **新增计划调整功能**
   - 新增 `adjustPlan(plan, adjustments): ExecutionPlan` 方法
   - 应用审查建议的调整到计划

**INTERFACE CHANGES**

```typescript
class PlanAgent {
  // 原有方法保留
  constructor(callLLM: LLMFunction)
  async makePlan(infos: Infos): Promise<ExecutionPlan>

  // NEW: 步骤审查
  async reviewStep(
    step: ExecutionStep,
    executionResult: StepResult,
    currentScope: Record<string, any>,
    currentPlan: ExecutionPlan
  ): Promise<{
    assessment: 'success' | 'partial' | 'failure'
    findings: string
    decision: 'CONTINUE' | 'MODIFY_PLAN' | 'ADD_STEPS' | 'REMOVE_STEPS' | 'REORDER' | 'TERMINATE'
    adjustments: PlanAdjustment[]
    reason: string
    nextStepRecommendation: string
  }>

  // NEW: 计划调整
  adjustPlan(
    plan: ExecutionPlan,
    adjustments: PlanAdjustment[]
  ): ExecutionPlan

  // NEW: 重新排序剩余步骤
  reorderRemainingSteps(
    plan: ExecutionPlan,
    newOrder: number[]
  ): ExecutionPlan
}
```

### Summary

本设计定义了AgentOrchestrator的核心架构和与三个现有Bot的集成方式：

1. **AgentOrchestrator** - 中央协调器，管理工作流状态、协调数据流、驱动整个流程
2. **WorkflowStateMachine** - 状态机，定义有效的工作流阶段和转换
3. **PlanReviewEngine** - 审查引擎，每步执行后评估结果并决定下一步
4. **QuestionAgent改造** - 从独立运行改为驱动式接口
5. **PlanAgent改造** - 新增reviewStep和adjustPlan功能

下一步将基于本设计创建详细的任务列表（tasks.md）。