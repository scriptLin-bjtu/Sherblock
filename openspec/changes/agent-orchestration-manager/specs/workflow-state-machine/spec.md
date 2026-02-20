## ADDED Requirements

### Requirement: State Definitions

The WorkflowStateMachine SHALL define all valid workflow states.

#### Scenario: State initialization
- **WHEN** a state machine is created
- **THEN** it SHALL support the following states:
  - `idle`: Initial state, waiting for workflow start
  - `collecting`: QuestionAgent is collecting user requirements
  - `planning`: PlanAgent is generating the analysis plan
  - `executing`: ExecuteAgent is executing the current step
  - `reviewing`: PlanAgent is reviewing execution results
  - `completed`: All steps have been executed and reviewed

### Requirement: Valid State Transitions

The WorkflowStateMachine SHALL enforce valid state transitions.

#### Scenario: Normal workflow transitions
- **WHEN** in `idle` state
- **THEN** valid transitions SHALL be: `collecting`
- **WHEN** in `collecting` state
- **THEN** valid transitions SHALL be: `planning`
- **WHEN** in `planning` state
- **THEN** valid transitions SHALL be: `executing`
- **WHEN** in `executing` state
- **THEN** valid transitions SHALL be: `reviewing`
- **WHEN** in `reviewing` state
- **THEN** valid transitions SHALL be: `executing`, `planning`, `completed`

#### Scenario: Review loop transitions
- **WHEN** review decision is to continue to next step
- **THEN** transition SHALL be: `reviewing` → `executing`
- **WHEN** review decision is to modify plan
- **THEN** transition SHALL be: `reviewing` → `planning`
- **WHEN** all steps are completed
- **THEN** transition SHALL be: `reviewing` → `completed`

#### Scenario: Error recovery transitions
- **WHEN** in any state and an error occurs
- **THEN** the state machine SHALL allow transition to `idle` for recovery
- **WHEN** recovery is complete
- **THEN** normal transitions SHALL resume from `idle`

### Requirement: Transition Guards

The WorkflowStateMachine SHALL enforce preconditions before allowing transitions.

#### Scenario: Collecting to planning transition guard
- **WHEN** attempting to transition from `collecting` to `planning`
- **THEN** the guard SHALL check that `infos` object is complete
- **AND** if not complete, the transition SHALL be rejected

#### Scenario: Planning to executing transition guard
- **WHEN** attempting to transition from `planning` to `executing`
- **THEN** the guard SHALL check that a valid `plan` exists
- **AND** the guard SHALL check that `scope` is initialized
- **AND** if either check fails, the transition SHALL be rejected

#### Scenario: Executing to reviewing transition guard
- **WHEN** attempting to transition from `executing` to `reviewing`
- **THEN** the guard SHALL check that a `stepResult` exists
- **AND** if no result, the transition SHALL be rejected

#### Scenario: Reviewing to completed transition guard
- **WHEN** attempting to transition from `reviewing` to `completed`
- **THEN** the guard SHALL check that all steps have been executed
- **AND** the guard SHALL check that the current step index equals or exceeds the plan length
- **AND** if steps remain, the transition SHALL be rejected

### Requirement: Transition Hooks

The WorkflowStateMachine SHALL support hooks for executing code at transition points.

#### Scenario: Before transition hook
- **WHEN** `beforeTransition` hook is registered
- **THEN** it SHALL be called before every transition
- **AND** it SHALL receive parameters: `from`, `to`, `context`
- **AND** if it returns `false`, the transition SHALL be cancelled

#### Scenario: After transition hook
- **WHEN** `afterTransition` hook is registered
- **THEN** it SHALL be called after every successful transition
- **AND** it SHALL receive parameters: `from`, `to`, `context`
- **AND** its return value SHALL be ignored

#### Scenario: Enter state hook
- **WHEN** `onEnterState` hook is registered for a specific state
- **THEN** it SHALL be called when entering that state
- **AND** it SHALL receive parameters: `state`, `context`

#### Scenario: Leave state hook
- **WHEN** `onLeaveState` hook is registered for a specific state
- **THEN** it SHALL be called when leaving that state
- **AND** it SHALL receive parameters: `state`, `context`

### Requirement: State Query Methods

The WorkflowStateMachine SHALL provide methods for querying state information.

#### Scenario: Get current state
- **WHEN** `getState()` is called
- **THEN** it SHALL return the current state identifier

#### Scenario: Get valid transitions
- **WHEN** `getValidTransitions()` is called
- **THEN** it SHALL return an array of valid next states from the current state

#### Scenario: Check transition validity
- **WHEN** `canTransition(to)` is called
- **THEN** it SHALL return `true` if the transition is valid from the current state
- **AND** it SHALL return `false` otherwise

#### Scenario: Reset state machine
- **WHEN** `reset()` is called
- **THEN** the state machine SHALL return to `idle` state
- **AND** all internal state SHALL be cleared
