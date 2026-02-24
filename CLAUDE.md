# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Blockchain Transaction Behavior Analysis Agent** - a multi-agent system for analyzing blockchain transactions and addresses. It uses a Plan-and-Execute architecture with three specialized agents coordinated by a central orchestrator. The project uses ES Modules (`"type": "module"`).

1. **QuestionAgent** (`src/agents/questionBot/`) - Interactive information collection using ReAct pattern
2. **PlanAgent** (`src/agents/planBot/`) - Strategic planning using deepseek-reasoner model
3. **ExecuteAgent** (`src/agents/executeBot/`) - Step execution using ReAct pattern with blockchain skills
4. **AgentOrchestrator** (`src/agents/orchestrator/`) - Central coordinator managing workflow state transitions

## Architecture

### Agent Architecture (Plan-and-Execute)

```
User Input → QuestionAgent → PlanAgent → ExecuteAgent (per step)
                                              ↓
                                         Blockchain Data
```

**Workflow Stages** (managed by `WorkflowStateMachine`):
- `IDLE` → `COLLECTING` → `PLANNING` → `EXECUTING` → `REVIEWING` → `COMPLETED`

### Agent Components

- **QuestionAgent**: Uses ReAct (Thought → Action → Observation) to collect user requirements through interactive questioning. Stores data in `infos` object with `user_questions`, `goal`, and `basic_infos`.
- **PlanAgent**: Takes collected information and generates a structured analysis plan with `scope` (state variables) and `steps` (execution steps). Uses DeepSeek Reasoner for complex reasoning. Also handles step review and plan adjustment.
- **ExecuteAgent**: Executes individual steps from the plan. Uses ReAct loop with three action types:
  - `USE_SKILL`: Call blockchain analysis skills (Etherscan API)
  - `UPDATE_SCOPE`: Update findings to shared state
  - `FINISH`: Complete the step
- **AgentOrchestrator**: Central coordinator that:
  - Manages state transitions with transition guards
  - Emits events for workflow monitoring
  - Handles execution with review loop
  - Supports pause/resume/stop control

### LLM Service (`src/services/agent.js`)

Unified interface for multiple LLM providers:
- **GLM** (default): `glm-4.7-flash`, supports thinking mode
- **DeepSeek**: `deepseek-chat`, standard chat model
- **DeepSeek Reasoner**: `deepseek-reasoner`, deep thinking mode (no temperature/top_p support)

### Blockchain Skills (`src/agents/executeBot/skills/`)

Modular skill system with 20+ skills organized by category. Each skill is a separate module in `[category]/[skill]/index.js`:
- **Account**: Balance, transactions, internal transactions, token transfers
- **Contract**: ABI, source code, creator
- **Transaction**: Receipt status, internal tx by hash
- **Token**: ERC20/ERC721/ERC1155 transfers, token supply
- **Proxy**: ETH RPC methods (block number, get block/tx, etc.)
- **Logs**: Event logs
- **Stats**: ETH price, supply

**Skill Registry** (`src/agents/executeBot/skills/index.js`): Dynamically loads skills from filesystem with:
- `SkillLoader`: Discovers and caches skills (caching improves performance)
- `SkillRegistry`: Manages loaded skills, validates parameters, resolves aliases
- **Skill Aliases**: Handles common LLM naming variations (e.g., `GET_NORMAL_TRANSACTIONS` → `GET_TRANSACTIONS`)

Each skill exports an object with:
- `name`, `description`, `category`, `params` (required/optional)
- `whenToUse` (array of scenarios)
- `execute(params, context)` async function

Skills use a shared `lib/etherscan-client.js` library for API calls with built-in parameter normalization (handles common LLM naming mistakes like `startBlock` → `startblock`).

Supported chains: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, and more.

## Development Commands

```bash
# Install dependencies
npm install

# Run the main application (interactive mode)
npm start
# or
node src/index.js

# Run Etherscan API test
npm test
# or
node src/test.js
```

## Configuration

Environment variables (in `.env`):
- `BIGMODEL_API_KEY` - GLM API key
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `ETHERSCAN_API_KEY` - Etherscan API key
- `HTTP_PROXY` - Proxy URL (defaults to `http://127.0.0.1:7890`)

**Note**: The `.env` file and `data/` directory are excluded from git (see `.gitignore`). Create `.env` locally with your API keys.

## Key Files and Structure

```
src/
├── index.js                    # Main entry point, agent initialization
├── test.js                     # Etherscan API test script
├── utils/
│   └── scope-manager.js       # Scope persistence to JSON file
├── services/
│   └── agent.js               # LLM service with multi-provider support
└── agents/
    ├── questionBot/
    │   ├── agent.js           # QuestionAgent - interactive info collection
    │   └── prompt.js          # ReAct prompt for questioning
    ├── planBot/
    │   ├── agent.js           # PlanAgent - strategic planning
    │   └── prompt.js          # Prompt for plan generation with scope/steps
    ├── executeBot/
    │   ├── agent.js           # ExecuteAgent - step execution with ReAct
    │   ├── prompt.js          # ReAct prompt with USE_SKILL/UPDATE_SCOPE/FINISH
    │   └── skills/            # Modular skill system
    │       ├── index.js       # Skill registry and loader
    │       └── [category]/[skill]/index.js
    └── orchestrator/
        ├── index.js           # AgentOrchestrator - central coordinator
        ├── events.js          # EventBus implementation
        └── state-machine.js   # Workflow state management with guards
```

**data/ directory** (created at runtime):
- `scope.json` - Current workflow scope persisted to file for debugging

## Important Implementation Details

1. **Proxy Configuration**: All external API calls (Etherscan, LLM providers) use a proxy configured via `HTTP_PROXY` env var (defaults to `http://127.0.0.1:7890`). Uses `undici`'s ProxyAgent.

2. **ReAct Pattern**: Both QuestionAgent and ExecuteAgent use ReAct (Reasoning + Acting) pattern. They call LLM with current state, get back a structured action, execute it, and feed observation back into the loop.

3. **State Management**:
   - QuestionAgent maintains `infos` object with `user_questions`, `goal`, `basic_infos`
   - PlanAgent generates a plan with `scope` (shared state) and `steps`
   - ExecuteAgent updates `scope` during execution via `UPDATE_SCOPE` actions
   - WorkflowStateMachine enforces state transitions with guards
   - **ScopeManager** (`src/utils/scope-manager.js`): Persists scope to JSON file (`data/scope.json`) for debugging and recovery

4. **Skill System**: Skills are modular and loaded dynamically. Each skill is a self-contained module that:
   - Defines its interface (name, params, when to use)
   - Implements parameter normalization (handles common LLM naming mistakes)
   - Calls Etherscan API with proxy and rate limiting
   - Compresses large responses to prevent context overflow

5. **LLM Provider Differences**: The `callLLM` function handles provider-specific formats:
   - GLM supports `thinking` mode
   - DeepSeek Reasoner has limited params (no temperature), returns `reasoning_content` separately
   - All providers use same base message format but different endpoint URLs

6. **Event-Driven Architecture**: AgentOrchestrator uses EventBus for communication. Events include:
   - `workflow:started`, `workflow:completed`, `workflow:error`
   - `stage:changed`
   - `step:started`, `step:completed`
   - `review:started`, `review:completed`
   - `question:asked`
