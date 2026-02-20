# AgentOrchestrator API Reference

## Class: `AgentOrchestrator`

The main orchestrator class that coordinates the blockchain analysis workflow.

### Constructor

```javascript
const orchestrator = new AgentOrchestrator(callLLM);
```

**Parameters:**
- `callLLM` (`Function`): LLM service function for making AI calls

### Properties

#### `workflowState`
Current state of the workflow execution.

```javascript
{
    stage: string,           // Current workflow stage
    scope: Object,           // Global shared state
    plan: Object,            // Execution plan
    currentStepIndex: number,// Current step index
    executionHistory: Array,// Execution history
    reviewResults: Array     // Review results
}
```

### Methods

#### `run(initialInput)`

Main entry point to start the workflow.

```javascript
const result = await orchestrator.run('Initial user input');
```

**Parameters:**
- `initialInput` (`string`, optional): Initial user input to start the workflow

**Returns:** `Promise<Object>` - Final workflow result

**Events Emitted:**
- `workflow:started`
- `workflow:completed`
- `workflow:error`

---

#### `getState()`

Get current workflow state.

```javascript
const state = orchestrator.getState();
```

**Returns:** `Object` - Current state including stage and workflow data

---

#### `pause()`

Pause the workflow execution.

```javascript
orchestrator.pause();
```

**Events Emitted:**
- `workflow:paused`

---

#### `resume()`

Resume the workflow execution.

```javascript
orchestrator.resume();
```

**Events Emitted:**
- `workflow:resumed`

---

#### `stop()`

Stop the workflow execution.

```javascript
orchestrator.stop();
```

**Events Emitted:**
- `workflow:stopped`

---

### Event Methods

#### `on(event, handler)`

Subscribe to an event.

```javascript
orchestrator.on('workflow:completed', (data) => {
    console.log('Workflow completed!');
});
```

**Parameters:**
- `event` (`string`): Event name
- `handler` (`Function`): Event handler function

**Returns:** `Function` - Unsubscribe function

---

#### `off(event, handler)`

Unsubscribe from an event.

```javascript
const unsubscribe = orchestrator.on('event', handler);
orchestrator.off('event', handler);
```

**Parameters:**
- `event` (`string`): Event name
- `handler` (`Function`): Event handler to remove

---

## Class: `WorkflowStateMachine`

State machine for managing workflow state transitions.

### Methods

#### `transition(to, context)`

Perform a state transition.

```javascript
await stateMachine.transition(WorkflowStage.COLLECTING, { infos: data });
```

**Parameters:**
- `to` (`string`): Target state
- `context` (`Object`, optional): Context for guards and hooks

**Returns:** `Promise<boolean>` - Whether transition succeeded

---

#### `canTransition(to)`

Check if a transition is valid.

```javascript
const canTransition = stateMachine.canTransition(WorkflowStage.PLANNING);
```

**Parameters:**
- `to` (`string`): Target state

**Returns:** `boolean` - Whether transition is valid

---

#### `getValidTransitions()`

Get list of valid next states.

```javascript
const validTransitions = stateMachine.getValidTransitions();
```

**Returns:** `Array<string>` - Valid next states

---

#### `getState()`

Get current state.

```javascript
const currentState = stateMachine.getState();
```

**Returns:** `string` - Current state

---

#### `reset()`

Reset to initial state.

```javascript
stateMachine.reset();
```

---

### Hooks

#### `beforeTransition(handler)`

Register a hook to run before transitions.

```javascript
stateMachine.beforeTransition((from, to, context) => {
    console.log(`Transitioning from ${from} to ${to}`);
});
```

**Parameters:**
- `handler` (`Function`): Hook function `(from, to, context) => void | false`

Return `false` from the handler to cancel the transition.

---

#### `afterTransition(handler)`

Register a hook to run after transitions.

```javascript
stateMachine.afterTransition((from, to, context) => {
    console.log(`Transitioned to ${to}`);
});
```

---

#### `onEnterState(state, handler)`

Register a hook for entering a specific state.

```javascript
stateMachine.onEnterState(WorkflowStage.EXECUTING, (state, context) => {
    console.log('Starting execution');
});
```

---

#### `onLeaveState(state, handler)`

Register a hook for leaving a specific state.

```javascript
stateMachine.onLeaveState(WorkflowStage.IDLE, (state, context) => {
    console.log('Leaving idle state');
});
```

## Class: `EventBus`

Simple event system for the orchestrator.

### Methods

#### `on(event, handler)`

Subscribe to an event.

```javascript
eventBus.on('custom:event', (data) => {
    console.log('Event received:', data);
});
```

**Returns:** `Function` - Unsubscribe function

---

#### `off(event, handler)`

Unsubscribe from an event.

---

#### `once(event, handler)`

Subscribe to an event once.

```javascript
eventBus.once('one:time', (data) => {
    // This will only fire once
});
```

---

#### `emit(event, data)`

Emit an event.

```javascript
eventBus.emit('custom:event', { message: 'Hello' });
```

---

#### `removeAll(event)`

Remove all handlers for an event.

```javascript
eventBus.removeAll('custom:event');
```
