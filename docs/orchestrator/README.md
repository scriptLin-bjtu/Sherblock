# Agent Orchestrator

The Agent Orchestrator is a central coordination system that manages the complete lifecycle of blockchain analysis workflows. It coordinates three specialized agents - QuestionAgent, PlanAgent, and ExecuteAgent - to provide end-to-end automated transaction analysis.

## Architecture

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

## Quick Start

```javascript
import { AgentOrchestrator } from './agents/orchestrator/index.js';
import { callLLM } from './services/agent.js';

// Initialize orchestrator
const orchestrator = new AgentOrchestrator(callLLM);

// Setup event listeners
orchestrator.on('workflow:started', () => {
    console.log('Workflow started');
});

orchestrator.on('stage:changed', (data) => {
    console.log(`Stage: ${data.from} -> ${data.to}`);
});

orchestrator.on('workflow:completed', () => {
    console.log('Workflow completed');
});

// Start workflow
const result = await orchestrator.run('Analyze transaction 0xabc... on Ethereum');
```

## Workflow Stages

The orchestrator manages the following workflow stages:

| Stage | Description | Entry | Exit |
|-------|-------------|-------|------|
| `idle` | Initial state | - | `collecting` |
| `collecting` | QuestionAgent gathering requirements | `idle` | `planning` |
| `planning` | PlanAgent generating analysis plan | `collecting` | `executing` |
| `executing` | ExecuteAgent running analysis steps | `planning`, `reviewing` | `reviewing` |
| `reviewing` | PlanAgent reviewing execution results | `executing` | `executing`, `planning`, `completed` |
| `completed` | Workflow finished | `reviewing` | - |

## Event System

The orchestrator emits the following events:

### Lifecycle Events
- `workflow:started` - Workflow has started
- `stage:changed` - Workflow stage has changed `{ from, to }`
- `workflow:completed` - Workflow has completed successfully
- `workflow:error` - An error occurred `{ error, stack }`
- `workflow:paused` - Workflow was paused
- `workflow:resumed` - Workflow was resumed
- `workflow:stopped` - Workflow was stopped

### Execution Events
- `collection:started` - Requirement collection started
- `collection:completed` - Requirement collection completed `{ infos }`
- `collection:error` - Collection error occurred `{ error }`
- `planning:started` - Plan generation started
- `planning:completed` - Plan generation completed `{ plan }`
- `planning:error` - Plan generation error `{ error }`
- `execution:started` - Execution phase started `{ totalSteps }`
- `execution:completed` - Execution phase completed `{ results }`

### Step Events
- `step:started` - Step execution started `{ stepIndex, step }`
- `step:completed` - Step execution completed `{ stepIndex, result }`

### Review Events
- `review:started` - Step review started `{ stepIndex }`
- `review:completed` - Step review completed `{ stepIndex, decision, adjustments }`

## API Reference

See [api.md](./api.md) for detailed API documentation.

## Workflow Documentation

See [workflow.md](./workflow.md) for detailed workflow documentation.
