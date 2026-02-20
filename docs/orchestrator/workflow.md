# Agent Orchestrator Workflow

This document describes the detailed workflow of the Agent Orchestrator system.

## Overview

The orchestrator implements a state machine-based workflow that coordinates three agents to perform blockchain transaction analysis:

1. **QuestionAgent** - Collects user requirements and context
2. **PlanAgent** - Generates and reviews the analysis plan
3. **ExecuteAgent** - Executes individual analysis steps

## Workflow Stages

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

### Stage 1: Idle

**Purpose**: Initial state before workflow starts

**Entry Conditions**:
- Orchestrator is instantiated
- No active workflow

**Actions**:
- Initialize agents
- Setup event listeners
- Prepare workflow state

**Exit Transitions**:
- `idle` → `collecting`: When `run()` is called

---

### Stage 2: Collecting

**Purpose**: Gather user requirements and context using QuestionAgent

**Entry Conditions**:
- `run()` method called with optional initial input

**Actions**:
1. Initialize requirement collection
2. Start ReAct loop with QuestionAgent
3. Handle user interactions (questions/answers)
4. Build `infos` object with:
   - `user_questions`: User's original question
   - `goal`: Analysis goal and constraints
   - `basic_infos`: Chain, transaction hash, addresses, etc.

**Data Structure - infos**:
```javascript
{
    user_questions: "What is the purpose of transaction 0xabc...?",
    goal: {
        analysis_type: "behavioral analysis",
        depth: "detailed",
        expected_output: "report",
        focus_points: ["sender intent", "contract interaction"],
        constraints: null
    },
    basic_infos: {
        chain: "ethereum",
        tx_hash: "0xabc...",
        address: null,
        context: { ... },
        related_addresses: [],
        time_range: null
    }
}
```

**Exit Transitions**:
- `collecting` → `planning`: When `infos` is complete and rich enough

---

### Stage 3: Planning

**Purpose**: Generate analysis plan using PlanAgent

**Entry Conditions**:
- `infos` object is complete
- QuestionAgent has finished collection

**Actions**:
1. Pass `infos` to PlanAgent
2. PlanAgent uses `deepseek-reasoner` for deep analysis
3. Generate structured plan with:
   - `scope`: Shared state variables
   - `steps`: Array of execution steps

**Data Structure - Plan**:
```javascript
{
    scope: {
        chain: "ethereum",
        target_address: "0x...",
        findings: {}
    },
    steps: [
        {
            index: 0,
            goal: "Get transaction details",
            success_criteria: ["transaction data retrieved"],
            constraints: ["use eth_getTransactionByHash"],
            dependencies: []
        },
        {
            index: 1,
            goal: "Analyze sender history",
            success_criteria: ["sender's recent transactions analyzed"],
            constraints: ["look back 30 days"],
            dependencies: [0]
        }
    ]
}
```

**Exit Transitions**:
- `planning` → `executing`: When plan is generated and scope is initialized

---

### Stage 4: Executing

**Purpose**: Execute analysis steps using ExecuteAgent

**Entry Conditions**:
- Valid plan exists
- Scope is initialized
- Current step is defined

**Actions**:
1. Execute current step using ExecuteAgent
2. ExecuteAgent runs ReAct loop:
   - USE_SKILL: Call blockchain analysis skills
   - UPDATE_SCOPE: Update findings
   - FINISH: Complete step
3. Record execution result
4. Update scope with findings

**ExecuteAgent Actions**:
```javascript
// USE_SKILL - Execute blockchain skill
{
    action_type: "USE_SKILL",
    skill_name: "get_transaction_by_hash",
    params: { tx_hash: "0xabc..." },
    chain_id: "1"
}

// UPDATE_SCOPE - Update findings
{
    action_type: "UPDATE_SCOPE",
    updates: {
        findings: { transaction_value: "1.5 ETH" }
    }
}

// FINISH - Complete step
{
    action_type: "FINISH",
    result: {
        status: "success",
        summary: "Transaction details retrieved",
        data: { ... }
    }
}
```

**Exit Transitions**:
- `executing` → `reviewing`: When step execution completes

---

### Stage 5: Reviewing

**Purpose**: Review execution results and decide on plan adjustments

**Entry Conditions**:
- Step execution completed
- Execution result available

**Actions**:
1. PlanAgent reviews execution result using `deepseek-reasoner`
2. Assess:
   - Execution success level (success/partial/failure)
   - Key findings and unexpected results
   - Validity of original plan assumptions
   - Whether remaining steps are still valid
3. Decide on action:
   - CONTINUE: Proceed to next step
   - MODIFY_PLAN: Adjust the plan
   - ADD_STEPS: Add new steps
   - REMOVE_STEPS: Remove steps
   - REORDER: Reorder remaining steps
   - TERMINATE: End the workflow

**Review Result Structure**:
```javascript
{
    assessment: "success",      // success | partial | failure
    findings: "Key findings...",
    decision: "CONTINUE",       // CONTINUE | MODIFY_PLAN | ADD_STEPS | REMOVE_STEPS | REORDER | TERMINATE
    adjustments: [],            // Plan adjustments if needed
    reason: "Decision rationale",
    nextStepRecommendation: "continue"
}
```

**Exit Transitions**:
- `reviewing` → `executing`: Decision is CONTINUE or after applying adjustments
- `reviewing` → `planning`: Decision is MODIFY_PLAN
- `reviewing` → `completed`: All steps completed or TERMINATE decision

---

### Stage 6: Completed

**Purpose**: Workflow has finished

**Entry Conditions**:
- All steps executed and reviewed
- Or workflow terminated

**Actions**:
1. Compile final results
2. Generate summary report
3. Clean up resources

**Exit Transitions:**
- None - terminal state

## Data Flow

```
1. User Input → QuestionAgent
   └─▶ infos { user_questions, goal, basic_infos }

2. infos → PlanAgent
   └─▶ plan { scope, steps[] }

3. plan + scope → ExecuteAgent
   └─▶ step_result { status, data, scope_updates }

4. step_result → PlanAgent (review)
   └─▶ review_result { decision, adjustments }

5. review_result → Continue / Modify / Complete
```

## Error Handling

The orchestrator implements multiple error recovery strategies:

1. **QuestionAgent Errors**
   - Input timeout → Retry 3 times
   - LLM API error → Exponential backoff

2. **PlanAgent Errors**
   - Plan generation failure → Use simplified default plan
   - Review failure → Skip and continue

3. **ExecuteAgent Errors**
   - Skill execution failure → Try alternative skill
   - Step failure → Ask PlanAgent whether to continue

4. **Orchestrator Errors**
   - State inconsistency → Recover from checkpoint
   - Unrecoverable error → Graceful termination with state preservation
