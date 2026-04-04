# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Blockchain Transaction Behavior Analysis Agent** - a multi-agent system for analyzing blockchain transactions and addresses. It uses a Plan-and-Execute architecture with three specialized agents coordinated by a central orchestrator. The project uses ES Modules (`"type": "module"`).

1. **QuestionAgent** (`src/agents/questionBot/`) - Interactive information collection using ReAct pattern
2. **PlanAgent** (`src/agents/planBot/`) - Strategic planning using deepseek-reasoner model
3. **ExecuteAgent** (`src/agents/executeBot/`) - Step execution using ReAct pattern with blockchain skills
4. **AgentOrchestrator** (`src/agents/orchestrator/`) - Central coordinator managing workflow state transitions

## System Environment

This system runs on **Windows** platform. All file paths, shell commands, and environment configurations should be compatible with Windows operating system.

## Architecture

### Agent Architecture (Plan-and-Execute)

```
User Input → QuestionAgent → PlanAgent → ExecuteAgent (per step)
                                              ↓
                                         Blockchain Data
```

**Workflow Stages** (managed by `WorkflowStateMachine`):
- `IDLE` → `COLLECTING` → `PLANNING` → `EXECUTING` → `REVIEWING` → `COMPLETED`

### Parallel Execution Mode

The system supports both **serial** and **parallel** execution modes:

- **Serial mode** (default): Steps execute sequentially in a while loop
- **Parallel mode**: Steps execute concurrently using DAG-based dependency resolution

**Supported since commit**: `cd83e4b` (Merge branch 'feature/parallel-tasks')

Key differences:
| Feature | Serial Mode | Parallel Mode |
|---------|-------------|---------------|
| Plan structure | steps array | DAG (Directed Acyclic Graph) |
| Execution | while loop | p-limit concurrency |
| Dependencies | next_step_hint | explicit depends_on + implicit inference |
| Scope updates | direct write | lock mechanism |

See `docs/parallel/README.md` for detailed parallel execution documentation.

### Parallel Execution Components

- **DAGBuilder** (`src/agents/orchestrator/dag-builder.js`): Builds directed acyclic graph from plan steps
- **ParallelExecutor** (`src/agents/orchestrator/parallel-executor.js`): Executes steps concurrently with dependency resolution
- **ScopeCoordinator** (`src/agents/orchestrator/scope-coordinator.js`): Manages thread-safe scope updates in parallel mode
- **TaskScheduler** (`src/agents/orchestrator/task-scheduler.js`): Schedules and tracks parallel task execution
- **DAGUtils** (`src/utils/dag-utils.js`): DAG utility functions for topological sorting and cycle detection

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

Modular skill system with 30+ skills organized by category. Each skill is a separate module in `[category]/[skill]/index.js`:

**Data Query Skills:**
- **Account**: Balance, transactions, internal transactions, token transfers, get-funded-by
- **Contract**: ABI, source code, creator
- **Transaction**: Receipt status, internal tx by hash
- **Token**: ERC20/ERC721/ERC1155 transfers, token supply, token info, token balance
- **Block**: Block details by number/hash
- **Gas**: Gas price, gas used statistics
- **Logs**: Event logs
- **Stats**: ETH price, supply, block reward
- **Nametag**: Address name tags and labels
- **Proxy**: Direct RPC calls (eth_getBlockByNumber, eth_call, etc.)

**Visualization & Reporting Skills:**
- **Report**: Generate structured markdown analysis reports from workflow context
- **Chart**: Generate visualization charts (line, bar, pie, scatter, radar) using Vega-Lite and Canvas

**Chart Generation Skills:**
- `CREATE_LINE_CHART` - Trend visualization (token prices, transaction volumes)
- `CREATE_BAR_CHART` - Comparison analysis (address metrics, token balances)
- `CREATE_PIE_CHART` - Proportional data (portfolio distribution, fund flow ratios)
- `CREATE_SCATTER_CHART` - Correlation analysis (transaction amount vs gas fees)
- `CREATE_RADAR_CHART` - Multi-dimensional profiling (address activity, risk assessment)

**Skill Registry** (`src/agents/executeBot/skills/index.js`): Dynamically loads skills from filesystem with:
- `SkillLoader`: Discovers and caches skills (caching improves performance)
- `SkillRegistry`: Manages loaded skills, validates parameters, resolves skill names
- `Skill Resolution`: Exact match only (no aliases - LLM must use correct skill names)

Each skill exports `default` object with:
- `name`, `description`, `category`, `params` (required/optional)
- `whenToUse` (array of scenarios)
- `execute(params, context)` async function

**Shared Skill Libraries** (`src/agents/executeBot/skills/lib/`):
- `etherscan-client.js` - Etherscan API client with:
  - `buildEtherscanUrl()` - API URL builder
  - `callEtherscanApi()` - API call with rate limiting
  - `normalizeParams()` - Parameter name normalization for LLM mistakes
  - `compressResponse()` - Response compression for context management
  - `summarizeTransactions()` - Transaction list summarization
- `chart-generator.js` - Chart generation using Vega-Lite and Canvas:
  - `generateChart()` - Main entry point for chart generation
  - `createLineChartSpec()`, `createBarChartSpec()`, etc. - Chart spec creators
  - `specToSvg()` - Convert Vega-Lite spec to SVG
- `config.js` - Configuration constants including supported chains
- `proxy-agent.js` - Proxy configuration for HTTP requests

**Supported chains** (via Etherscan API v2):
- Ethereum (mainnet): `1`
- Polygon: `137`
- BSC: `56`
- Arbitrum: `42161`
- Optimism: `10`
- Base: `8453`
- Avalanche: `43114`
- Linea: `59144`
- Blast: `81457`
- Scroll: `534352`
- Gnosis: `100`
- Celo: `42220`
- Moonbeam: `1284`
- Sepolia (testnet): `11155111`
- Polygon Amoy (testnet): `80002`

### Workspace Management (`src/utils/workspace-manager.js`)

Each task execution creates a unique workspace directory to isolate task files:
- Workspace ID format: `workspace-YYYYMMDD-HHmmss-{random}`
- Workspace structure:
  - `data/{workspaceId}/` - Root workspace directory
  - `data/{workspaceId}/logs/` - Execution logs
  - `data/{workspaceId}/charts/` - Generated charts
  - `data/{workspaceId}/reports/` - Generated reports
  - `data/{workspaceId}/scope.json` - Persisted scope for debugging

### Web Interface (Frontend)

Vue.js frontend for real-time task monitoring:

```bash
cd frontend && npm run dev
```

Features:
- Real-time workspace status via WebSocket
- Task execution progress tracking
- View generated reports and charts

### Server System

HTTP and WebSocket server for frontend communication:

| Service | Port | Path |
|---------|------|------|
| HTTP | 3000 | http://localhost:3000 |
| WebSocket | 8080 | ws://localhost:8080/ws |

```bash
# Start server
node src/server-index.js
```

**Server Modules:**
- `http-server.js` - Static file serving and REST API
- `websocket-server.js` - Real-time message push
- `workspace-watcher.js` - File system monitoring for workspace changes
- `message-handler.js` - Client message processing
- `workflow-logger.js` - Workflow event logging

### Context Compression (`src/agents/executeBot/compression/`)

CompressionManager coordinates all compression operations:
- **HistoryCompressor**: Compresses execution history to reduce token usage
- **ScopeFilter**: Filters scope data to only relevant fields for current step
- Token estimation for prompt size management

## Dependencies

Key backend dependencies:
- `undici` - HTTP/1.1 client for making requests (includes ProxyAgent support)
- `dotenv` - Environment variable management
- `express` - HTTP server framework
- `ws` - WebSocket server
- `chokidar` - File system watcher
- `p-limit` - Promise concurrency limiter (for parallel execution)
- `canvas` - Canvas implementation for Node.js (chart rendering)
- `vega` - Visualization grammar for chart generation
- `vega-lite` - High-level declarative format for visualizations

Frontend dependencies (in `frontend/package.json`):
- `vite` - Build tool and dev server
- `marked` - Markdown rendering

Test dependencies:
- `vitest` - Unit testing framework

## Development Commands

```bash
# Install all dependencies (backend + frontend)
npm install
cd frontend && npm install

# Run the main application (default: parallel execution)
npm start

# Run serial execution mode
node src/index.js

# Run Etherscan API test
npm test

# Run unit tests
npm run test:unit
npm run test:watch  # watch mode

# Start HTTP + WebSocket server (for frontend communication)
npm run server
# or
node src/server-index.js

# Start frontend development server
npm run dev:frontend
# or
cd frontend && npm run dev

# Start full dev environment (server + frontend)
npm run dev
```

## Configuration

Environment variables (in `.env`):
- `BIGMODEL_API_KEY` - GLM API key
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `ETHERSCAN_API_KEY` - Etherscan API key
- `HTTP_PROXY` - Proxy URL (defaults to `http://127.0.0.1:7890`)

**Server configuration** (optional):
- `HTTP_PORT` - HTTP server port (default: 3000)
- `WS_PORT` - WebSocket server port (default: 8080)

**Parallel execution configuration** (optional):
- `MAX_PARALLEL_TASKS` - Maximum parallel tasks (default: 3)
- `USE_PARALLEL_EXECUTION` - Enable parallel mode (`true`/`false`)
- `CONTINUE_ON_FAILURE` - Continue on failure (`true`/`false`)

**Note**: The `.env` file and `data/` directory are excluded from git (see `.gitignore`). Create `.env` locally with your API keys.

## Documentation

Detailed documentation available in `docs/`:
- `docs/orchestrator/` - Orchestrator architecture, events, workflow, API
- `docs/parallel/` - Parallel execution design and implementation
- `docs/execute-skills.md` - Skill system details

## Key Files and Structure

```
src/
├── index.js                    # Main entry point, agent initialization
├── server-index.js             # Server entry point (HTTP + WebSocket)
├── test.js                     # Etherscan API test script
├── utils/
│   ├── workspace-manager.js    # Workspace directory management
│   ├── scope-manager.js        # Scope persistence to JSON file
│   ├── workflow-logger.js      # Workflow event logging
│   └── dag-utils.js            # DAG utility functions
├── services/
│   └── agent.js                # LLM service with multi-provider support
├── server/
│   ├── index.js                # Server core
│   ├── http-server.js          # HTTP server
│   ├── websocket-server.js     # WebSocket server
│   ├── workspace-watcher.js    # File system watcher
│   └── message-handler.js      # Client message processing
└── agents/
    ├── questionBot/
    │   ├── agent.js            # QuestionAgent - interactive info collection
    │   └── prompt.js           # ReAct prompt for questioning
    ├── planBot/
    │   ├── agent.js            # PlanAgent - strategic planning
    │   ├── prompt-serial.js    # Serial plan prompt
    │   └── prompt-parallel.js  # Parallel plan prompt
    ├── executeBot/
    │   ├── agent.js            # ExecuteAgent - step execution with ReAct
    │   ├── prompt-system.js    # System prompt for ExecuteAgent
    │   ├── compression/        # Context compression system
    │   │   ├── config.js
    │   │   ├── manager.js
    │   │   ├── history-compressor.js
    │   │   └── scope-filter.js
    │   └── skills/             # Modular skill system
    │       ├── index.js        # Skill registry and loader
    │       ├── lib/            # Shared libraries
    │       └── [category]/[skill]/index.js
    └── orchestrator/
        ├── index.js            # AgentOrchestrator - central coordinator
        ├── events.js           # EventBus implementation
        ├── state-machine.js    # Workflow state management with guards
        ├── dag-builder.js      # DAG builder for parallel execution
        ├── parallel-executor.js# Parallel task executor
        ├── scope-coordinator.js# Thread-safe scope coordination
        └── task-scheduler.js   # Task scheduling

frontend/                       # Vue.js frontend
├── src/
│   ├── main.js                # Frontend entry
│   ├── app.js                 # Vue app component
│   └── services/
│       └── websocket.js       # WebSocket client
└── package.json
```

## Important Implementation Details

1. **Proxy Configuration**: All external API calls (Etherscan, LLM providers) use a proxy configured via `HTTP_PROXY` env var (defaults to `http://127.0.0.1:7890`). Uses `undici`'s ProxyAgent.

2. **ReAct Pattern**: Both QuestionAgent and ExecuteAgent use ReAct (Reasoning + Acting) pattern. They call LLM with current state, get back a structured action, execute it, and feed observation back into the loop.

3. **State Management**:
   - QuestionAgent maintains `infos` object with `user_questions`, `goal`, `basic_infos`
   - PlanAgent generates a plan with `scope` (shared state) and `steps`
   - ExecuteAgent updates `scope` during execution via `UPDATE_SCOPE` actions
   - WorkflowStateMachine enforces state transitions with guards
   - **ScopeManager** (`src/utils/scope-manager.js`): Persists scope to workspace `scope.json` for debugging and recovery
   - **WorkspaceManager** (`src/utils/workspace-manager.js`): Creates isolated workspace directories for each task

4. **Skill System**: Skills are modular and loaded dynamically. Each skill is a self-contained module that:
   - Defines its interface (name, params, when to use)
   - Implements parameter normalization (handles common LLM naming mistakes)
   - Calls Etherscan API with proxy and rate limiting
   - Compresses large responses to prevent context overflow

5. **Report Generation**: `GENERATE_MARKDOWN_REPORT` skill:
   - Generates structured markdown reports from workflow context
   - Saves to workspace's `reports/` directory
   - Report sections: Summary, Goals, Key Findings, Detailed Data, Visualization Charts
   - Automatically embeds all SVG charts from `charts/` directory
   - Filename format: `report-YYYYMMDD-HHmmss.md` or custom filename

6. **LLM Provider Differences**: The `callLLM` function handles provider-specific formats:
   - GLM supports `thinking` mode
   - DeepSeek Reasoner has limited params (no temperature), returns `reasoning_content` separately
   - All providers use same base message format but different endpoint URLs

7. **Event-Driven Architecture**: AgentOrchestrator uses EventBus for communication. Events include:
   - `workflow:started`, `workflow:completed`, `workflow:error`
   - `stage:changed`
   - `step:started`, `step:completed`
   - `review:started`, `review:completed`
   - `question:asked`
