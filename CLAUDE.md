# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Blockchain Transaction Behavior Analysis Agent** - a multi-agent system for analyzing blockchain transactions and addresses. It uses a Plan-and-Execute architecture with three specialized agents:

1. **QuestionAgent** (`src/agents/questionBot/`) - Interactive information collection using ReAct pattern
2. **PlanAgent** (`src/agents/planBot/`) - Strategic planning using deepseek-reasoner model
3. **ExecuteAgent** (`src/agents/executeBot/`) - Step execution using ReAct pattern with blockchain skills

## Architecture

### Agent Architecture (Plan-and-Execute)

```
User Input → QuestionAgent → PlanAgent → ExecuteAgent (per step)
                                              ↓
                                         Blockchain Data
```

- **QuestionAgent**: Uses ReAct (Thought → Action → Observation) to collect user requirements through interactive questioning. Stores data in `infos` object with `user_questions`, `goal`, and `basic_infos`.

- **PlanAgent**: Takes collected information and generates a structured analysis plan with `scope` (state variables) and `steps` (execution steps). Uses DeepSeek Reasoner for complex reasoning.

- **ExecuteAgent**: Executes individual steps from the plan. Uses ReAct loop with three action types:
  - `USE_SKILL`: Call blockchain analysis skills (Etherscan API)
  - `UPDATE_SCOPE`: Update findings to shared state
  - `FINISH`: Complete the step

### LLM Service (`src/services/agent.js`)

Unified interface for multiple LLM providers:
- **GLM** (default): `glm-4.7-flash`, supports thinking mode
- **DeepSeek**: `deepseek-chat`, standard chat model
- **DeepSeek Reasoner**: `deepseek-reasoner`, deep thinking mode (no temperature/top_p support)

### Blockchain Skills (`src/agents/executeBot/skills.js`)

Etherscan V2 API wrapper with 20+ skills organized by category:
- **Account**: Balance, transactions, internal transactions, token transfers
- **Contract**: ABI, source code, creator
- **Transaction**: Receipt status, internal tx by hash
- **Token**: ERC20/ERC721/ERC1155 transfers, token supply
- **Proxy**: ETH RPC methods (block number, get block/tx, etc.)
- **Logs**: Event logs
- **Stats**: ETH price, supply

Supported chains: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, and more.

## Development Commands

```bash
# Install dependencies
npm install

# Run the main application
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

## Key Files and Structure

```
src/
├── index.js                    # Main entry point, agent initialization
├── test.js                     # Etherscan API test script
├── services/
│   └── agent.js               # LLM service with multi-provider support
└── agents/
    ├── questionBot/
    │   ├── agent.js           # QuestionAgent - interactive info collection
    │   └── prompt.js          # ReAct prompt for questioning
    ├── planBot/
    │   ├── agent.js           # PlanAgent - strategic planning
    │   └── prompt.js          # Prompt for plan generation with scope/steps
    └── executeBot/
        ├── agent.js           # ExecuteAgent - step execution with ReAct
        ├── prompt.js          # ReAct prompt with USE_SKILL/UPDATE_SCOPE/FINISH
        └── skills.js          # Etherscan API skills and utilities
```

## Important Implementation Details

1. **Proxy Configuration**: The codebase uses a local proxy (`http://127.0.0.1:7890`) for all external API calls (Etherscan, LLM providers). This is configured in `skills.js` and `agent.js` using `undici`'s `ProxyAgent`.

2. **ReAct Pattern**: Both QuestionAgent and ExecuteAgent use the ReAct (Reasoning + Acting) pattern. They call the LLM with current state, get back a structured action (ASK/UPDATE/FINISH or USE_SKILL/UPDATE_SCOPE/FINISH), execute it, and feed the observation back into the loop.

3. **State Management**:
   - QuestionAgent maintains `infos` object with `user_questions`, `goal`, `basic_infos`
   - PlanAgent generates a plan with `scope` (shared state) and `steps`
   - ExecuteAgent updates `scope` during execution via `UPDATE_SCOPE` actions

4. **Skill System**: Skills are declarative definitions in `skills.js` that map to Etherscan API endpoints. Each skill specifies required/optional params, expected output, and when to use. The `buildSkillUrl` function constructs the actual API URL.

5. **LLM Provider Differences**: The `callLLM` function handles provider-specific request/response formats:
   - GLM supports `thinking` mode
   - DeepSeek Reasoner has limited params (no temperature), returns `reasoning_content` separately
   - All providers use the same base message format but different endpoint URLs
