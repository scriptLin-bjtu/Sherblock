## MODIFIED Requirements

### Requirement: Question Agent Collection Mode

The QuestionAgent SHALL support a driver-based collection mode in addition to the existing standalone mode.

#### Scenario: Collection mode selection
- **WHEN** the QuestionAgent is instantiated
- **THEN** it SHALL default to driver-based mode (no automatic execution)
- **AND** it SHALL NOT automatically start a readline interface
- **AND** it SHALL wait for explicit method calls to begin collection

#### Scenario: Standalone mode deprecation
- **WHEN** the `run()` method is called
- **THEN** it SHALL log a deprecation warning
- **AND** it SHALL delegate to `collectRequirements()` for backward compatibility
- **AND** it SHALL include a note about migrating to the new API

### Requirement: Driver-Based Collection Interface

The QuestionAgent SHALL provide a `collectRequirements` method that enables external control over the requirement collection process.

#### Scenario: Basic collection with initial input
- **WHEN** `collectRequirements(initialInput)` is called
- **THEN** it SHALL start the ReAct loop with the initial input
- **AND** it SHALL return a Promise that resolves to the collected `infos` object
- **AND** it SHALL continue the ReAct loop until the `FINISH` action is triggered

#### Scenario: Collection with question callback
- **WHEN** `collectRequirements(initialInput, options)` is called with `options.onQuestion`
- **THEN** whenever the ReAct loop needs user input
- **AND** the `onQuestion` callback SHALL be invoked with the question text
- **AND** the callback SHALL return a Promise that resolves to the user's answer
- **AND** the ReAct loop SHALL continue with the answer

#### Scenario: Collection with event emitter
- **WHEN** `collectRequirements(initialInput, options)` is called with `options.eventEmitter`
- **THEN** whenever the ReAct loop needs user input
- **AND** the QuestionAgent SHALL emit a 'question' event with { question, resolve, reject }
- **AND** the external code SHALL call `resolve(answer)` to provide input
- **OR** the external code SHALL call `reject(error)` to cancel

### Requirement: ReAct Loop Suspension for User Input

The QuestionAgent SHALL support suspending the ReAct loop when user input is required.

#### Scenario: Loop suspension on ASK action
- **WHEN** the ReAct loop encounters an `ASK` action
- **THEN** it SHALL pause the loop execution
- **AND** it SHALL invoke the configured input mechanism (callback or event)
- **AND** it SHALL wait for the external code to provide input

#### Scenario: Loop resumption after input
- **WHEN** user input is provided through the configured mechanism
- **THEN** the ReAct loop SHALL resume
- **AND** it SHALL continue with the user's answer as the next observation
- **AND** it SHALL proceed with the next LLM call

#### Scenario: Timeout handling
- **WHEN** user input is not provided within a configurable timeout (default: 5 minutes)
- **THEN** the QuestionAgent SHALL reject with a timeout error
- **AND** the ReAct loop SHALL terminate
- **AND** the `collectRequirements` promise SHALL reject with the error

### Requirement: Collection Progress Tracking

The QuestionAgent SHALL provide methods to track the progress of requirement collection.

#### Scenario: Completion status query
- **WHEN** `isComplete()` is called
- **THEN** it SHALL return `true` if all required fields in `infos` are populated
- **AND** it SHALL return `false` otherwise
- **AND** it SHALL use the same logic as the `FINISH` action validation

#### Scenario: Progress information query
- **WHEN** `getProgress()` is called
- **THEN** it SHALL return an object containing:
  - `totalFields`: total number of fields in the `infos` structure
  - `filledFields`: number of fields that are non-null
  - `isRichEnough`: boolean indicating if collected info meets richness criteria
- **AND** these values SHALL be calculated from the current `infos` state

### Requirement: Backward Compatibility

The QuestionAgent SHALL maintain backward compatibility for existing code during the transition period.

#### Scenario: Existing run() method behavior
- **WHEN** existing code calls `run()` method
- **THEN** it SHALL continue to work as before (with deprecation warning)
- **AND** it SHALL start the interactive readline mode
- **AND** it SHALL process user input from stdin
- **AND** it SHALL maintain the existing behavior until explicitly changed

#### Scenario: Migration path documentation
- **WHEN** the deprecation warning is logged
- **THEN** it SHALL include a link to migration documentation
- **AND** it SHALL show example usage of the new `collectRequirements` method
- **AND** it SHALL indicate the version in which `run()` will be removed
