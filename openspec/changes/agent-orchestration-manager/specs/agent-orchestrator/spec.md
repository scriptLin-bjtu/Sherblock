## ADDED Requirements

### Requirement: Agent Orchestrator Lifecycle Management

The AgentOrchestrator SHALL manage the complete lifecycle of the blockchain analysis workflow, coordinating QuestionAgent, PlanAgent, and ExecuteAgent.

#### Scenario: Normal workflow execution
- **WHEN** the orchestrator is started with an optional initial input
- **THEN** it SHALL initialize all three agents
- **AND** it SHALL execute the phases in order: requirement collection, plan generation, execution with review
- **AND** it SHALL return the final result when complete

#### Scenario: Error handling during workflow
- **WHEN** an error occurs in any phase
- **THEN** the orchestrator SHALL attempt to recover from recoverable errors
- **AND** for unrecoverable errors, it SHALL gracefully terminate with error details
- **AND** it SHALL preserve the current state for debugging

### Requirement: Global State Management

The AgentOrchestrator SHALL maintain a global `workflowState` object that is shared across all workflow phases.

#### Scenario: State initialization
- **WHEN** the orchestrator is constructed
- **THEN** it SHALL initialize `workflowState` with:
  - `stage`: 'idle'
  - `scope`: null
  - `plan`: null
  - `currentStepIndex`: 0
  - `executionHistory`: []
  - `reviewResults`: []

#### Scenario: State updates during workflow
- **WHEN** transitioning between phases
- **THEN** the orchestrator SHALL update the `stage` field
- **AND** it SHALL update `scope` with new findings from ExecuteAgent
- **AND** it SHALL append completed steps to `executionHistory`
- **AND** it SHALL append review results to `reviewResults`

### Requirement: Data Flow Coordination

The AgentOrchestrator SHALL coordinate data flow between agents, ensuring each agent receives the correct inputs.

#### Scenario: QuestionAgent to PlanAgent handoff
- **WHEN** QuestionAgent completes requirement collection
- **THEN** the orchestrator SHALL extract the `infos` object
- **AND** it SHALL pass `infos` to PlanAgent.makePlan()
- **AND** it SHALL store the returned plan in `workflowState.plan`

#### Scenario: Orchestrator to ExecuteAgent handoff
- **WHEN** executing a plan step
- **THEN** the orchestrator SHALL construct the current scope
- **AND** it SHALL identify the current step from `workflowState.plan`
- **AND** it SHALL call ExecuteAgent.executeStep(scope, currentStep)
- **AND** it SHALL update `workflowState.scope` with the returned results

### Requirement: Review Loop Integration

The AgentOrchestrator SHALL implement the review loop, where PlanAgent reviews each completed step and decides on plan adjustments.

#### Scenario: Step review after execution
- **WHEN** ExecuteAgent completes a step
- **THEN** the orchestrator SHALL call PlanAgent.reviewStep()
- **AND** it SHALL pass the step, execution result, current scope, and plan
- **AND** it SHALL receive a ReviewResult containing the decision

#### Scenario: Plan adjustment application
- **WHEN** the review result contains adjustments
- **THEN** the orchestrator SHALL call PlanAgent.adjustPlan()
- **AND** it SHALL update `workflowState.plan` with the adjusted plan
- **AND** it SHALL continue execution with the updated plan

#### Scenario: Review decision handling
- **WHEN** the review decision is 'CONTINUE'
- **THEN** the orchestrator SHALL proceed to the next step
- **WHEN** the decision is 'MODIFY_PLAN' or similar
- **THEN** it SHALL apply adjustments before continuing
- **WHEN** the decision is 'TERMINATE'
- **THEN** it SHALL gracefully terminate the workflow

### Requirement: Event System

The AgentOrchestrator SHALL provide an event system for monitoring workflow progress.

#### Scenario: Event subscription
- **WHEN** a component calls `orchestrator.on(event, handler)`
- **THEN** the handler SHALL be registered for that event
- **AND** it SHALL be called when the event is emitted

#### Scenario: Lifecycle events
- **WHEN** the workflow starts
- **THEN** the orchestrator SHALL emit 'workflow:started'
- **WHEN** the stage changes
- **THEN** it SHALL emit 'stage:changed' with { from, to }
- **WHEN** a step starts
- **THEN** it SHALL emit 'step:started' with { stepIndex, step }
- **WHEN** a step completes
- **THEN** it SHALL emit 'step:completed' with { stepIndex, result }
- **WHEN** the workflow completes
- **THEN** it SHALL emit 'workflow:completed'
- **WHEN** an error occurs
- **THEN** it SHALL emit 'workflow:error' with error details

#### Scenario: Review events
- **WHEN** a review starts
- **THEN** the orchestrator SHALL emit 'review:started'
- **WHEN** a review completes
- **THEN** it SHALL emit 'review:completed' with { decision, adjustments }
