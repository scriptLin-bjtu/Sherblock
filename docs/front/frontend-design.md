# 前端设计

## 前端目录结构

```
frontend/
├── index.html                 # 入口HTML文件
├── src/
│   ├── main.js                # 主入口文件
│   ├── app.js                 # 应用主逻辑
│   ├── components/            # 组件模块
│   │   ├── layout.js          # 布局组件
│   │   ├── left-panel.js      # 左侧工作区列表面板
│   │   ├── center-panel.js    # 中间对话区域
│   │   └── right-panel.js     # 右侧工作区详情面板
│   ├── workspace/             # 工作区相关模块
│   │   ├── workspace-list.js  # 工作区列表组件
│   │   ├── workspace-details.js # 工作区详情组件
│   │   ├── scope-viewer.js    # Scope查看器
│   │   ├── chart-viewer.js    # 图表查看器
│   │   ├── report-viewer.js   # 报告查看器
│   │   └── log-viewer.js      # 日志查看器
│   ├── chat/                 # 聊天相关模块
│   │   ├── chat-container.js  # 聊天容器组件
│   │   ├── message-list.js    # 消息列表组件
│   │   └── input-box.js      # 输入框组件
│   ├── services/             # 服务层
│   │   ├── websocket.js       # WebSocket服务
│   │   ├── api.js            # HTTP API服务
│   │   └── state.js          # 应用状态管理
│   ├── utils/                # 工具函数
│   │   ├── dom.js            # DOM操作工具
│   │   ├── format.js         # 格式化工具
│   │   └── markdown.js       # Markdown处理工具
│   └── styles/               # 样式文件
│       ├── base.css          # 基础样式
│       ├── layout.css        # 布局样式
│       ├── components.css     # 组件样式
│       └── themes.css        # 主题样式
├── package.json
└── vite.config.js
```

## 数据结构定义（JSDoc注释）

使用JSDoc注释提供类型提示和文档：

```javascript
/**
 * WebSocket消息结构
 * @typedef {Object} WSMessage
 * @property {string} id - 消息唯一ID
 * @property {string} type - 消息类型
 * @property {number} timestamp - 时间戳
 * @property {*} payload - 消息负载
 * @property {string} [workspaceId] - 关联的工作区ID
 */

/**
 * 工作区信息
 * @typedef {Object} Workspace
 * @property {string} workspaceId - 工作区ID
 * @property {number} createdAt - 创建时间戳
 * @property {boolean} hasCharts - 是否有图表
 * @property {boolean} hasReports - 是否有报告
 * @property {boolean} hasLogs - 是否有日志
 * @property {string} title - 工作区标题
 */

/**
 * 工作区详情
 * @typedef {Object} WorkspaceDetails
 * @property {string} workspaceId - 工作区ID
 * @property {*} scope - Scope数据
 * @property {ChartFile[]} charts - 图表文件列表
 * @property {ReportFile[]} reports - 报告文件列表
 * @property {LogFile[]} logs - 日志文件列表
 */

/**
 * 图表文件
 * @typedef {Object} ChartFile
 * @property {string} name - 文件名
 * @property {string} svg - SVG内容
 */

/**
 * 报告文件
 * @typedef {Object} ReportFile
 * @property {string} name - 文件名
 * @property {string} content - Markdown内容
 */

/**
 * 日志文件
 * @typedef {Object} LogFile
 * @property {string} name - 文件名
 * @property {string} content - 日志内容
 */

/**
 * Agent消息
 * @typedef {Object} AgentMessage
 * @property {string} agent - Agent名称
 * @property {string} message - 消息内容
 * @property {boolean} [requiresInput] - 是否需要用户输入
 */

/**
 * 工作流阶段
 * @typedef {'idle'|'collecting'|'planning'|'executing'|'reviewing'|'completed'} WorkflowStage
 */
```

## WebSocket服务 (`frontend/src/services/websocket.js`)
```javascript
/**
 * WebSocket服务类
 * @class
 */
export class WebSocketService {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      // 发送初始化消息
      this.send('INIT', {
        apiKeys: {
          glm: localStorage.getItem('GLM_API_KEY') || '',
          deepseek: localStorage.getItem('DEEPSEEK_API_KEY') || '',
          etherscan: localStorage.getItem('ETHERSCAN_API_KEY') || ''
        }
      });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.payload);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 1000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  off(type) {
    this.messageHandlers.delete(type);
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        id: Date.now().toString(),
        type,
        timestamp: Date.now(),
        payload
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

## 主应用 (`frontend/src/app.js`)
```javascript
import { WebSocketService } from './services/websocket.js';

class App {
  constructor() {
    this.ws = new WebSocketService('ws://localhost:3000');
    this.state = {
      selectedWorkspace: null,
      workspaces: [],
      messages: [],
      isAnalyzing: false,
      activeTab: 'scope'
    };
    this.init();
  }

  init() {
    // 连接WebSocket
    this.ws.connect();

    // 注册消息处理器
    this.ws.on('INIT_RESPONSE', (payload) => {
      this.state.workspaces = payload.workspaces;
      this.renderWorkspaceList();
    });

    this.ws.on('WORKSPACES_LIST', (payload) => {
      this.state.workspaces = payload.workspaces;
      this.renderWorkspaceList();
    });

    this.ws.on('WORKSPACE_DETAILS', (payload) => {
      this.renderWorkspaceDetails(payload);
    });

    this.ws.on('AGENT_MESSAGE', (payload) => {
      this.state.messages.push(payload);
      this.renderMessages();
    });

    this.ws.on('STAGE_CHANGED', (payload) => {
      this.updateStageIndicator(payload);
    });

    this.ws.on('STEP_STARTED', (payload) => {
      this.updateStepProgress(payload);
    });

    this.ws.on('STEP_COMPLETED', (payload) => {
      this.updateStepProgress(payload);
    });

    this.ws.on('ANALYSIS_STARTED', (payload) => {
      this.state.isAnalyzing = true;
      this.updateInputState();
    });

    this.ws.on('ANALYSIS_COMPLETED', (payload) => {
      this.state.isAnalyzing = false;
      this.updateInputState();
    });

    this.ws.on('ERROR', (payload) => {
      this.showError(payload.error);
    });

    // 初始化UI
    this.initUI();
  }

  initUI() {
    // 初始化布局
    this.createLayout();
    // 渲染工作区列表
    this.renderWorkspaceList();
  }

  createLayout() {
    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="app-layout">
        <!-- 左侧工作区列表面板 -->
        <div class="left-panel">
          <div class="panel-header">
            <h2>工作区</h2>
            <button id="create-workspace-btn">+ 新建工作区</button>
          </div>
          <div id="workspace-list" class="workspace-list"></div>
        </div>

        <!-- 中间对话区域 -->
        <div class="center-panel">
          <div id="workspace-header" class="workspace-header hidden">
            <h2 id="workspace-title"></h2>
            <span id="workspace-id" class="workspace-id"></span>
          </div>
          <div id="messages-container" class="messages-container"></div>
          <div id="stage-indicator" class="stage-indicator hidden"></div>
          <div id="step-progress" class="step-progress hidden"></div>
          <div class="input-area">
            <textarea id="message-input" placeholder="输入你的问题..."></textarea>
            <button id="send-btn">发送</button>
          </div>
        </div>

        <!-- 右侧工作区详情面板 -->
        <div class="right-panel">
          <div id="tabs" class="tabs hidden">
            <button data-tab="scope" class="tab-btn active">Scope</button>
            <button data-tab="charts" class="tab-btn">Charts</button>
            <button data-tab="reports" class="tab-btn">Reports</button>
            <button data-tab="logs" class="tab-btn">Logs</button>
          </div>
          <div id="workspace-details" class="workspace-details"></div>
        </div>
      </div>
    `;

    // 绑定事件
    this.bindEvents();
  }

  bindEvents() {
    // 创建工作区
    document.getElementById('create-workspace-btn').addEventListener('click', () => {
      this.createWorkspace();
    });

    // 发送消息
    document.getElementById('send-btn').addEventListener('click', () => {
      this.sendMessage();
    });

    // 回车发送消息
    document.getElementById('message-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Tab切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  renderWorkspaceList() {
    const container = document.getElementById('workspace-list');
    container.innerHTML = this.state.workspaces.map(workspace => `
      <div class="workspace-item ${this.state.selectedWorkspace?.workspaceId === workspace.workspaceId ? 'active' : ''}"
           data-workspace-id="${workspace.workspaceId}">
        <div class="workspace-title">${workspace.title}</div>
        <div class="workspace-meta">
          <span>${new Date(workspace.createdAt).toLocaleString()}</span>
          ${workspace.hasCharts ? '<span class="badge">📊</span>' : ''}
          ${workspace.hasReports ? '<span class="badge">📄</span>' : ''}
          ${workspace.hasLogs ? '<span class="badge">📝</span>' : ''}
        </div>
      </div>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.workspace-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectWorkspace(item.dataset.workspaceId);
      });
    });
  }

  selectWorkspace(workspaceId) {
    this.state.selectedWorkspace = this.state.workspaces.find(w => w.workspaceId === workspaceId);
    this.state.messages = [];
    this.renderWorkspaceList();

    // 显示工作区信息
    document.getElementById('workspace-header').classList.remove('hidden');
    document.getElementById('workspace-title').textContent = this.state.selectedWorkspace.title;
    document.getElementById('workspace-id').textContent = this.state.selectedWorkspace.workspaceId;
    document.getElementById('tabs').classList.remove('hidden');

    // 清空消息和详情
    document.getElementById('messages-container').innerHTML = '';
    document.getElementById('workspace-details').innerHTML = '';

    // 请求工作区详情
    this.ws.send('GET_WORKSPACE', { workspaceId });
  }

  createWorkspace() {
    this.ws.send('CREATE_WORKSPACE', {});
  }

  sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message || !this.state.selectedWorkspace || this.state.isAnalyzing) {
      return;
    }

    // 添加用户消息
    this.state.messages.push({
      type: 'user',
      message
    });
    this.renderMessages();

    // 清空输入框
    input.value = '';

    // 发送分析请求
    this.ws.send('START_ANALYSIS', {
      workspaceId: this.state.selectedWorkspace.workspaceId,
      input: message
    });
  }

  renderMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = this.state.messages.map(msg => `
      <div class="message ${msg.type === 'user' ? 'user-message' : 'agent-message'}">
        ${msg.type === 'user' ? `<div class="message-content">${this.escapeHtml(msg.message)}</div>` :
          `<div class="message-header">${msg.agent}</div>
           <div class="message-content">${this.escapeHtml(msg.message)}</div>
           ${msg.requiresInput ? '<div class="input-required">请输入回答...</div>' : ''}`}
      </div>
    `).join('');

    // 滚动到底部
    container.scrollTop = container.scrollHeight;
  }

  renderWorkspaceDetails(details) {
    const container = document.getElementById('workspace-details');
    const tab = this.state.activeTab;

    switch (tab) {
      case 'scope':
        this.renderScope(container, details.scope);
        break;
      case 'charts':
        this.renderCharts(container, details.charts);
        break;
      case 'reports':
        this.renderReports(container, details.reports);
        break;
      case 'logs':
        this.renderLogs(container, details.logs);
        break;
    }
  }

  renderScope(container, scope) {
    container.innerHTML = `<pre class="json-viewer">${JSON.stringify(scope, null, 2)}</pre>`;
  }

  renderCharts(container, charts) {
    container.innerHTML = charts.map(chart => `
      <div class="chart-item">
        <h3>${chart.name}</h3>
        <div class="chart-content">${chart.svg}</div>
      </div>
    `).join('');
  }

  renderReports(container, reports) {
    container.innerHTML = reports.map(report => `
      <div class="report-item">
        <h3>${report.name}</h3>
        <div class="report-content">${marked.parse(report.content)}</div>
      </div>
    `).join('');
  }

  renderLogs(container, logs) {
    container.innerHTML = logs.map(log => `
      <div class="log-item">
        <h3>${log.name}</h3>
        <pre class="log-content">${this.escapeHtml(log.content)}</pre>
      </div>
    `).join('');
  }

  switchTab(tab) {
    this.state.activeTab = tab;

    // 更新Tab样式
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 重新渲染详情
    if (this.state.selectedWorkspace) {
      this.ws.send('GET_WORKSPACE', { workspaceId: this.state.selectedWorkspace.workspaceId });
    }
  }

  updateStageIndicator(data) {
    const indicator = document.getElementById('stage-indicator');
    indicator.textContent = `当前阶段: ${data.to.toUpperCase()}`;
    indicator.classList.remove('hidden');
  }

  updateStepProgress(data) {
    const progress = document.getElementById('step-progress');
    const stepIndex = data.stepIndex;
    const step = data.step;

    if (step) {
      progress.textContent = `步骤 ${stepIndex + 1}: ${step.description || '执行中...'}`;
      progress.classList.remove('hidden');
    }
  }

  updateInputState() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    if (this.state.isAnalyzing) {
      input.disabled = true;
      input.placeholder = '分析中...';
      sendBtn.disabled = true;
    } else {
      input.disabled = false;
      input.placeholder = '输入你的问题...';
      sendBtn.disabled = false;
    }
  }

  showError(error) {
    const container = document.getElementById('messages-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error-message';
    errorDiv.innerHTML = `<div class="message-content">❌ 错误: ${this.escapeHtml(error)}</div>`;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 启动应用
new App();
```
