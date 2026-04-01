# 后端WebSocket服务器设计

## 目录结构

```
src/
├── server/
│   ├── index.js              # WebSocket服务器入口
│   ├── websocket-server.js   # WebSocket服务器实现
│   ├── http-server.js        # HTTP静态文件服务
│   ├── message-handler.js    # 消息处理器
│   └── workspace-watcher.js  # 工作区文件监听器
├── adapters/                  # Agent适配器（新增）
│   ├── orchestrator-adapter.js  # Orchestrator适配
│   └── websocket-adapter.js     # WebSocket适配
└── [现有目录保持不变]
```

## WebSocket消息协议

### 消息格式
```javascript
{
  id: string,           // 消息唯一ID
  type: string,         // 消息类型
  timestamp: number,     // 时间戳
  payload: any,         // 消息负载
  workspaceId?: string  // 关联的工作区ID
}
```

### 消息类型

| 消息类型 | 方向 | 说明 | Payload |
|---------|------|------|---------|
| `INIT` | Client→Server | 初始化连接 | `{ apiKeys: {...} }` |
| `INIT_RESPONSE` | Server→Client | 初始化响应 | `{ workspaces: [...] }` |
| `GET_WORKSPACES` | Client→Server | 获取工作区列表 | `{}` |
| `WORKSPACES_LIST` | Server→Client | 工作区列表更新 | `{ workspaces: [...] }` |
| `GET_WORKSPACE` | Client→Server | 获取工作区详情 | `{ workspaceId: string }` |
| `WORKSPACE_DETAILS` | Server→Client | 工作区详情 | `{ workspaceId, scope, charts, reports, logs }` |
| `CREATE_WORKSPACE` | Client→Server | 创建新工作区 | `{}` |
| `WORKSPACE_CREATED` | Server→Client | 工作区创建通知 | `{ workspaceId }` |
| `DELETE_WORKSPACE` | Client→Server | 删除工作区 | `{ workspaceId }` |
| `WORKSPACE_DELETED` | Server→Client | 工作区删除通知 | `{ workspaceId }` |
| `START_ANALYSIS` | Client→Server | 启动分析 | `{ workspaceId, input: string }` |
| `ANALYSIS_STARTED` | Server→Client | 分析开始 | `{ workspaceId }` |
| `AGENT_MESSAGE` | Server→Client | Agent消息 | `{ workspaceId, agent, message }` |
| `STAGE_CHANGED` | Server→Client | 阶段变更 | `{ workspaceId, from, to }` |
| `STEP_STARTED` | Server→Client | 步骤开始 | `{ workspaceId, stepIndex, step }` |
| `STEP_COMPLETED` | Server→Client | 步骤完成 | `{ workspaceId, stepIndex, result }` |
| `SCOPE_UPDATED` | Server→Client | Scope更新 | `{ workspaceId, scope }` |
| `CHART_GENERATED` | Server→Client | 图表生成 | `{ workspaceId, chartName, svg }` |
| `REPORT_GENERATED` | Server→Client | 报告生成 | `{ workspaceId, reportName, content }` |
| `ANALYSIS_COMPLETED` | Server→Client | 分析完成 | `{ workspaceId, result }` |
| `ERROR` | Server→Client | 错误消息 | `{ workspaceId, error }` |
| `FILE_CHANGED` | Server→Client | 文件变化通知 | `{ workspaceId, fileType, filename }` |

## 核心代码设计

### WebSocket服务器 (`src/server/websocket-server.js`)
```javascript
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import MessageHandler from './message-handler.js';

export class WebSocketServer {
  constructor(httpServer, options = {}) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.messageHandler = new MessageHandler();
    this.clients = new Map();
    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const response = await this.messageHandler.handle(message, ws);
          if (response) {
            ws.send(JSON.stringify(response));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            id: message.id,
            type: 'ERROR',
            timestamp: Date.now(),
            payload: { error: error.message }
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }

  broadcast(type, payload) {
    const message = JSON.stringify({
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      payload
    });
    this.clients.forEach(ws => ws.send(message));
  }
}
```

### 消息处理器 (`src/server/message-handler.js`)
```javascript
import workspaceManager from '../utils/workspace-manager.js';
import scopeManager from '../utils/scope-manager.js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export default class MessageHandler {
  constructor() {
    this.activeWorkflows = new Map();
  }

  async handle(message, ws) {
    switch (message.type) {
      case 'INIT':
        return await this.handleInit(message);
      case 'GET_WORKSPACES':
        return await this.handleGetWorkspaces();
      case 'GET_WORKSPACE':
        return await this.handleGetWorkspace(message);
      case 'CREATE_WORKSPACE':
        return await this.handleCreateWorkspace(message);
      case 'DELETE_WORKSPACE':
        return await this.handleDeleteWorkspace(message);
      case 'START_ANALYSIS':
        return await this.handleStartAnalysis(message, ws);
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  async handleInit(message) {
    // 验证API密钥
    if (message.payload.apiKeys) {
      process.env.GLM_API_KEY = message.payload.apiKeys.glm;
      process.env.DEEPSEEK_API_KEY = message.payload.apiKeys.deepseek;
      process.env.ETHERSCAN_API_KEY = message.payload.apiKeys.etherscan;
    }
    return {
      id: message.id,
      type: 'INIT_RESPONSE',
      timestamp: Date.now(),
      payload: {
        workspaces: await this.listWorkspaces()
      }
    };
  }

  async handleGetWorkspaces() {
    return {
      id: message.id,
      type: 'WORKSPACES_LIST',
      timestamp: Date.now(),
      payload: { workspaces: await this.listWorkspaces() }
    };
  }

  async listWorkspaces() {
    const dataDir = join(process.cwd(), 'data');
    const entries = await readdir(dataDir, { withFileTypes: true });
    const workspaces = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('workspace-')) {
        const workspacePath = join(dataDir, entry.name);
        const {
          id: workspaceId,
          createdAt,
          scope
        } = await this.getWorkspaceInfo(entry.name);

        workspaces.push({
          workspaceId,
          createdAt,
          hasCharts: await this.hasFiles(workspacePath, 'charts'),
          hasReports: await this.hasFiles(workspacePath, 'reports'),
          hasLogs: await this.hasFiles(workspacePath, 'logs'),
          title: scope?.basic_infos?.user_questions || entry.name
        });
      }
    }

    return workspaces.sort((a, b) => b.createdAt - a.createdAt);
  }

  async handleGetWorkspace(message) {
    const { workspaceId } = message.payload;
    const workspacePath = join(process.cwd(), 'data', workspaceId);

    const [scope, charts, reports, logs] = await Promise.all([
      this.readScope(workspacePath),
      this.readFiles(workspacePath, 'charts'),
      this.readFiles(workspacePath, 'reports'),
      this.readFiles(workspacePath, 'logs')
    ]);

    return {
      id: message.id,
      type: 'WORKSPACE_DETAILS',
      timestamp: Date.now(),
      payload: { workspaceId, scope, charts, reports, logs }
    };
  }

  async handleStartAnalysis(message, ws) {
    const { workspaceId, input } = message.payload;

    // 创建Orchestrator适配器
    const adapter = new OrchestratorAdapter(ws, workspaceId);
    this.activeWorkflows.set(workspaceId, adapter);

    // 异步启动分析
    adapter.run(input).catch(error => {
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { workspaceId, error: error.message }
      }));
    });

    return {
      id: message.id,
      type: 'ANALYSIS_STARTED',
      timestamp: Date.now(),
      payload: { workspaceId }
    };
  }

  // ... 其他方法
}
```

## Agent适配器设计

### Orchestrator适配器 (`src/adapters/orchestrator-adapter.js`)
```javascript
import { AgentOrchestrator } from '../agents/orchestrator/index.js';
import { callLLM } from '../services/agent.js';
import workspaceManager from '../utils/workspace-manager.js';

export class OrchestratorAdapter {
  constructor(ws, workspaceId) {
    this.ws = ws;
    this.workspaceId = workspaceId;
    this.orchestrator = new AgentOrchestrator(callLLM, {
      // 使用WebSocket作为输入输出
      askUser: this.askUser.bind(this)
    });
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 监听所有事件并转发到WebSocket
    this.orchestrator.on('workflow:started', (data) => {
      this.send('ANALYSIS_STARTED', { workspaceId: this.workspaceId });
    });

    this.orchestrator.on('workflow:completed', (data) => {
      this.send('ANALYSIS_COMPLETED', {
        workspaceId: this.workspaceId,
        result: data
      });
    });

    this.orchestrator.on('stage:changed', (data) => {
      this.send('STAGE_CHANGED', {
        workspaceId: this.workspaceId,
        from: data.from,
        to: data.to
      });
    });

    this.orchestrator.on('step:started', (data) => {
      this.send('STEP_STARTED', {
        workspaceId: this.workspaceId,
        stepIndex: data.stepIndex,
        step: data.step
      });
    });

    this.orchestrator.on('step:completed', (data) => {
      this.send('STEP_COMPLETED', {
        workspaceId: this.workspaceId,
        stepIndex: data.stepIndex,
        result: data.result
      });
    });

    this.orchestrator.on('question:asked', (data) => {
      this.send('AGENT_MESSAGE', {
        workspaceId: this.workspaceId,
        agent: 'QuestionAgent',
        message: data.question
      });
    });
  }

  askUser(question) {
    // 返回Promise，等待WebSocket回复
    return new Promise((resolve) => {
      this.pendingQuestion = resolve;
      this.send('AGENT_MESSAGE', {
        workspaceId: this.workspaceId,
        agent: 'QuestionAgent',
        message: question,
        requiresInput: true
      });
    });
  }

  handleUserInput(input) {
    if (this.pendingQuestion) {
)      this.pendingQuestion(input);
      this.pendingQuestion = null;
    }
  }

  send(type, payload) {
    this.ws.send(JSON.stringify({
      id: Date.now().toString(),
      type,
      timestamp: Date.now(),
      payload
    }));
  }

  async run(initialInput) {
    // 初始化工作区
    await workspaceManager.initialize();

    // 运行orchestrator
    return await this.orchestrator.run(initialInput);
  }
}
```

## 工作区文件监听器

### `src/server/workspace-watcher.js`
```javascript
import { watch } from 'chokidar';

export class WorkspaceWatcher {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
    this.watcher = null;
  }

  start() {
    const dataDir = join(process.cwd(), 'data');
    this.watcher = watch(dataDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    this.watcher
      .on('add', path => this.handleFileChange('add', path))
      .on('change', path => this.handleFileChange('change', path))
      .on('unlink', path => this.handleFileChange('unlink', path));
  }

  handleFileChange(event, filePath) {
    const parts = filePath.split(/[\/\\]/);
    const dataIndex = parts.indexOf('data');

    if (dataIndex !== -1 && parts[dataIndex + 1]) {
      const workspaceId = parts[dataIndex + 1];

      if (parts.length > dataIndex + 2) {
        const fileType = parts[dataIndex + 2]; // charts, reports, logs
        const filename = parts[dataIndex + 3];

        this.messageHandler.broadcast('FILE_CHANGED', {
          workspaceId,
          event,
          fileType,
          filename
        });
      }
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
```
