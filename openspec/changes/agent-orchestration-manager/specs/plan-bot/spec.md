## MODIFIED Requirements

### Requirement: Plan Generation

The PlanAgent SHALL generate execution plans based on collected requirement information. This existing requirement remains unchanged.

#### Scenario: Plan generation with deepseek-reasoner
- **WHEN** `makePlan(infos)` is called with complete requirement information
- **THEN** it SHALL use the deepseek-reasoner model
- **AND** it SHALL generate a structured plan with scope and steps
- **AND** it SHALL return the plan as an ExecutionPlan object

### Requirement: Step Review

The PlanAgent SHALL support reviewing completed step executions to assess results and determine plan adjustments.

#### Scenario: Review after step execution
- **WHEN** `reviewStep(step, executionResult, currentScope, currentPlan)` is called
- **THEN** it SHALL use the deepseek-reasoner model for deep analysis
- **AND** it SHALL assess the execution result as success, partial, or failure
- **AND** it SHALL summarize key findings from the execution
- **AND** it SHALL evaluate whether the original plan assumptions remain valid
- **AND** it SHALL assess the remaining steps for validity
- **AND** it SHALL determine if plan adjustments are needed
- **AND** it SHALL return a structured ReviewResult object

#### Scenario: Review with execution failure
- **WHEN** reviewStep is called after a failed execution
- **THEN** the assessment SHALL be 'failure'
- **AND** the findings SHALL include error details and root cause analysis
- **AND** the decision SHALL recommend either retry, modification, or termination
- **AND** adjustments SHALL include specific changes to address the failure

#### Scenario: Review with unexpected findings
- **WHEN** reviewStep is called after discovering unexpected information
- **THEN** the findings SHALL highlight the unexpected discoveries
- **AND** the plan assumption validation SHALL flag affected assumptions
- **AND** the decision SHALL recommend appropriate action (continue, modify, add steps)
- **AND** adjustments SHALL incorporate responses to the unexpected findings

### Requirement: Plan Adjustment

The PlanAgent SHALL support applying adjustments to the current plan based on review results.

#### Scenario: Adding steps to plan
- **WHEN** `adjustPlan(plan, adjustments)` is called with add-type adjustments
- **THEN** for each 'add' adjustment:
  - It SHALL create a new step with the provided step data
  - It SHALL assign an appropriate step index
  - It SHALL insert the step at the specified position
  - It SHALL renumber subsequent steps if necessary
- **AND** it SHALL return the updated plan

#### Scenario: Modifying steps in plan
- **WHEN** `adjustPlan(plan, adjustments)` is called with modify-type adjustments
- **THEN** for each 'modify' adjustment:
  - It SHALL locate the step at the specified index
  - It SHALL update the specified fields with new values
  - It SHALL preserve fields that are not being modified
  - It SHALL maintain the step's original index
- **AND** it SHALL return the updated plan

#### Scenario: Removing steps from plan
- **WHEN** `adjustPlan(plan, adjustments)` is called with remove-type adjustments
- **THEN** for each 'remove' adjustment:
  - It SHALL locate the step at the specified index
  - It SHALL mark the step as 'removed' (not physically delete)
  - It SHALL preserve the step in history for audit purposes
  - It SHALL skip removed steps during execution
- **AND** it SHALL return the updated plan

#### Scenario: Reordering steps in plan
- **WHEN** `adjustPlan(plan, adjustments)` is called with reorder-type adjustments
- **THEN** for each 'reorder' adjustment:
  - It SHALL validate the new order array
  - It SHALL update step indices according to the new order
  - It SHALL maintain the relative order of steps not in the reorder list
  - It SHALL ensure all remaining steps have valid, unique indices
- **AND** it SHALL return the updated plan

### Requirement: Step Reordering

The PlanAgent SHALL support reordering remaining steps without affecting completed steps.

#### Scenario: Reordering remaining steps only
- **WHEN** `reorderRemainingSteps(plan, newOrder)` is called
- **THEN** it SHALL identify the current step index from the workflow state
- **AND** it SHALL only reorder steps with index greater than current
- **AND** it SHALL preserve the order of completed steps (index <= current)
- **AND** it SHALL validate that newOrder contains valid indices for remaining steps
- **AND** it SHALL return the plan with reordered steps

#### Scenario: Validation of new order
- **WHEN** reorderRemainingSteps is called with an invalid newOrder
- **THEN** it SHALL validate that all indices in newOrder are valid remaining step indices
- **AND** it SHALL validate that no indices are duplicated
- **AND** it SHALL validate that all remaining step indices are included
- **AND** if validation fails, it SHALL throw an error with a descriptive message
