<div align="center">

# 🕵️‍♂️ Sherblock

**Blockchain Transaction Behavior Analysis Agent - Like Sherlock Holmes for blockchain data**

*Sherlock + Block = Sherblock: Uncover hidden patterns and insights in blockchain transactions*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node.js-16%2B-green.svg)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/javascript-ES2020-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

[English](README.md) | [中文](README-zh.md)

</div>

## 📋 Project Overview

Sherblock is an advanced multi-agent system designed for intelligent blockchain transaction and address behavior analysis. Built on a Plan-and-Execute architecture, it combines the power of large language models (LLMs) with specialized blockchain analysis skills to automate complex investigation workflows.

Whether you're tracking fund flows, analyzing smart contract interactions, profiling wallet addresses, or investigating suspicious activity, Sherblock acts as your AI-powered blockchain detective, handling the heavy lifting of data collection, analysis, and reporting.

## ✨ Key Features

- **🤖 Multi-Agent Collaboration**: Three specialized agents working in harmony:
  - QuestionAgent: Interactive requirement collection using ReAct pattern
  - PlanAgent: Strategic planning powered by deep reasoning models
  - ExecuteAgent: Step-by-step execution with blockchain analysis skills

- **⚡ Parallel Execution Engine**: DAG-based task scheduling with concurrent execution support, drastically improving analysis speed for complex tasks

- **🛠️ Extensive Skill System**: 34+ professional skills covering all aspects of blockchain data analysis:
  - Account, Contract, Transaction, Token queries
  - Block, Gas, Logs, Stats, Nametag information
  - Chart generation and automated report writing

- **📊 Visualization & Reporting**: Built-in support for generating various chart types (line, bar, pie, scatter, radar) and structured markdown analysis reports

- **🌐 Multi-Chain Support**: Works with 13+ mainstream blockchain networks including Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, and more

- **🎯 Intelligent Context Management**: Adaptive context compression for long-running complex analysis tasks, preventing context overflow

- **🖥️ Dual Interface**: Both web-based real-time monitoring dashboard and CLI interaction mode

- **🔄 State Machine Workflow**: Complete 6-stage workflow management (IDLE → COLLECTING → PLANNING → EXECUTING → REVIEWING → COMPLETED)

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   QuestionAgent    │───▶│    PlanAgent        │───▶│   ExecuteAgent      │
│  (Requirement      │    │  (Plan Generation   │    │  (Step Execution    │
│   Collection)      │    │   & Review)         │    │   with Skills)      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                        │                        │
          └────────────────────────┴────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│                   AgentOrchestrator                      │
│  (Workflow Coordinator, State Management, Event Bus)     │
└───────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Parallel Execution │    │   Scope Manager     │    │  Workspace Manager  │
│  Engine (DAG)       │    │  (Context State)    │    │  (Isolated Storage) │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│                    Skills Registry                        │
│  (34+ Skills for Blockchain Data Acquisition & Analysis) │
└───────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Etherscan API     │    │   LLM Providers     │    │  Visualization Libs │
│  (Blockchain Data)  │    │  (DeepSeek)         │    │  (Vega, Canvas)     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Core Components

| Component | Responsibility |
|-----------|----------------|
| **AgentOrchestrator** | Central coordinator managing workflow state transitions and event distribution |
| **QuestionAgent** | Interactive information collection to understand user analysis requirements |
| **PlanAgent** | Generates structured analysis plans and reviews execution results |
| **ExecuteAgent** | Executes individual plan steps using ReAct pattern with blockchain skills |
| **DAGBuilder** | Builds directed acyclic graph from plan steps for parallel execution |
| **ParallelExecutor** | Concurrent task execution with dependency resolution |
| **SkillRegistry** | Dynamically loads and manages 34+ specialized blockchain analysis skills |
| **ScopeCoordinator** | Thread-safe context state management for parallel execution |
| **WorkspaceManager** | Creates isolated workspaces for each task to store logs, charts, and reports |

## 🔧 Prerequisites

- Node.js 16.0+
- npm or yarn package manager
- Windows 10+/macOS 10.15+/Linux
- API keys for:
  - DeepSeek
  - Etherscan

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/scriptLin-bjtu/Sherblock.git
   cd sherblock
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Configure environment variables**
   ```bash
   # Copy example environment file
   cp .env.example .env
   ```
   
   Edit `.env` file with your API keys:
   ```env
   # Required API Keys
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   
   # Optional Configuration
   MAX_PARALLEL_TASKS=3
   USE_PARALLEL_EXECUTION=true
   CONTINUE_ON_FAILURE=false
   HTTP_PROXY=http://127.0.0.1:7890
   ```

## 🚀 Usage

### Web Interface Mode (Recommended)

1. **Start full development environment**
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:5173`

3. **Enter your analysis request** in the input box and watch the analysis process in real-time

4. **View results** including generated reports, charts, and analysis findings

### CLI Mode

1. **Run in parallel execution mode (default)**
   ```bash
   npm start
   ```

2. **Run in serial execution mode**
   ```bash
   node src/index.js
   ```

3. **Custom parallel execution**
   ```bash
   # With custom max parallel tasks
   npm start -- --parallel --max-parallel 5
   
   # Disable review step for faster execution
   npm start -- --no-review
   ```

4. **View help**
   ```bash
   node src/index.js --help
   ```

## 📸 Screenshots

> 📝 **Note:** Replace these with actual screenshots of your application

### Web Dashboard
![Web Dashboard](docs/screenshots/dashboard.png)
*Real-time analysis monitoring dashboard showing task progress and results*

### DAG Parallel Execution View
![DAG Execution](docs/screenshots/dag.png)
*Visualization of parallel task execution with dependency graph*

### Generated Analysis Report
![Analysis Report](docs/screenshots/report.png)
*Auto-generated markdown report with charts and findings*

## ⚙️ Configuration

### Required API Keys

| API Key | Purpose | Where to Get |
|---------|---------|--------------|
| `DEEPSEEK_API_KEY` | DeepSeek models for reasoning and execution | [DeepSeek Platform](https://platform.deepseek.com/) |
| `ETHERSCAN_API_KEY` | Blockchain data acquisition | [Etherscan APIs](https://etherscan.io/apis) |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_PARALLEL_TASKS` | `3` | Maximum number of parallel execution tasks |
| `USE_PARALLEL_EXECUTION` | `true` | Enable/disable parallel execution mode |
| `CONTINUE_ON_FAILURE` | `false` | Continue execution even if some tasks fail |
| `HTTP_PORT` | `3000` | HTTP server port |
| `WS_PORT` | `8080` | WebSocket server port |
| `HTTP_PROXY` | `http://127.0.0.1:7890` | Proxy server for API requests |
| `API_TIMEOUT` | `30000` | API request timeout in milliseconds |

## 📚 Supported Chains & Skills

### Supported Blockchain Networks

#### Mainnets
- Ethereum (1)
- Polygon (137)
- BSC (56)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- Avalanche (43114)
- Linea (59144)
- Blast (81457)
- Scroll (534352)
- Gnosis (100)
- Celo (42220)
- Moonbeam (1284)

#### Testnets
- Sepolia (11155111)
- Polygon Amoy (80002)

### Skill Categories

1. **Account**: Balance queries, transaction history, internal transactions, fund source tracing
2. **Contract**: ABI retrieval, source code queries, contract creator information
3. **Transaction**: Transaction status, receipt details, internal transactions by hash
4. **Token**: ERC20/ERC721/ERC1155 transfers, token information, balance queries
5. **Block**: Block details by number/hash, timestamp-based block lookup
6. **Gas**: Gas price estimation, gas usage statistics
7. **Logs**: Smart contract event log queries
8. **Stats**: ETH price, network supply, block reward statistics
9. **Nametag**: Address labeling and identity information
10. **Proxy**: Direct ETH RPC calls for advanced queries
11. **Visualization**: Chart generation (line, bar, pie, scatter, radar)
12. **Reporting**: Automated markdown report generation

## 🛠️ Development

### Available Scripts

```bash
# Start full development environment (server + frontend)
npm run dev

# Start only backend HTTP + WebSocket server
npm run server

# Start only frontend development server
npm run dev:frontend

# Run CLI mode (parallel execution)
npm start

# Run unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Project Structure

```
sherblock/
├── src/
│   ├── agents/              # Agent implementations
│   │   ├── questionBot/     # QuestionAgent (requirement collection)
│   │   ├── planBot/         # PlanAgent (planning & review)
│   │   ├── executeBot/      # ExecuteAgent (step execution)
│   │   │   └── skills/      # 34+ blockchain analysis skills
│   │   └── orchestrator/    # AgentOrchestrator (workflow coordination)
│   ├── services/            # External services (LLM, etc.)
│   ├── server/              # HTTP and WebSocket server
│   ├── utils/               # Utility functions
│   ├── index.js             # CLI entry point
│   └── server-index.js      # Server entry point
├── frontend/                # Vanilla JS web interface
├── docs/                    # Documentation
├── data/                    # Workspace storage (gitignored)
├── .env.example             # Environment variable template
└── package.json             # Project dependencies
```

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

1. **Fork the repository** and create your feature branch: `git checkout -b feature/amazing-feature`
2. **Make your changes**: Add new skills, fix bugs, improve documentation, or enhance existing features
3. **Test your changes**: Run existing tests and add new ones for new functionality
4. **Commit your changes**: `git commit -m 'Add some amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**: I'll review your changes and merge them if they align with the project goals

### Contribution Guidelines

- Follow existing code style and conventions
- Add appropriate comments for complex logic
- Update documentation for any changed functionality
- Ensure all tests pass before submitting a PR
- Keep PRs focused on a single feature or bug fix

## ❓ FAQ

### Q: Which LLM models are supported?
A: Currently I exclusively use DeepSeek models: DeepSeek Chat for general tasks and DeepSeek Reasoner for complex planning and review.

### Q: Can I add support for more blockchain networks?
A: Yes! The skill system is designed to be extensible. You can add support for new networks by updating the Etherscan client configuration.

### Q: How do I add new analysis skills?
A: Create a new skill module in `src/agents/executeBot/skills/[category]/[skill-name]/` following the existing skill pattern, and it will be automatically loaded.

### Q: Is there a rate limit for Etherscan API calls?
A: Yes, free Etherscan API keys have a rate limit of 5 calls/second. The system includes built-in rate limiting and retries.

### Q: Can I use this for commercial purposes?
A: Yes! Sherblock is released under the MIT license, which allows commercial use, modification, and distribution.

### Q: Will you support more LLM providers in the future?
A: Yes! Currently I use DeepSeek models exclusively, but I plan to add support for multiple LLM providers (including OpenAI, Anthropic Claude, Google Gemini, etc.) in future releases, allowing users to choose their preferred model provider via API key configuration.

## 🤝 Contact & Collaboration

If you're interested in collaborating on this project, have feature requests, or want to discuss any ideas, feel free to reach out to me:

- 📧 Email: [p1091451463@gmail.com](mailto:p1091451463@gmail.com)

I'm always open to partnerships and contributions to build Sherblock together!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


---

<div align="center">
Made with ❤️ by scriptLin
</div>
