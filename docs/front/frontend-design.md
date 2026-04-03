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
│   ├── execution/            # 执行模式相关
│   │   ├── mode-selector.js  # 执行模式选择器
│   │   ├── dag-viewer.js     # DAG可视化组件
│   │   └── parallel-status.js # 并行任务状态显示
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

/**
 * 执行模式
 * @typedef {'serial'|'parallel'} ExecutionMode
 */

/**
 * 步骤状态
 * @typedef {'pending'|'running'|'completed'|'failed'|'waiting'} StepStatus
 */

/**
 * 步骤信息（用于并行执行DAG）
 * @typedef {Object} StepInfo
 * @property {number} stepIndex - 步骤索引
 * @property {StepStatus} status - 步骤状态
 * @property {string} description - 步骤描述
 * @property {number[]} dependsOn - 依赖的步骤索引数组
 */

/**
 * 执行模式状态
 * @typedef {Object} ExecutionModeState
 * @property {ExecutionMode} mode - 当前执行模式
 * @property {number} maxParallel - 最大并行数
 * @property {StepInfo[]} steps - 所有步骤状态列表
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
      activeTab: 'scope',
      // 新增：执行模式相关状态
      executionMode: 'serial',
      maxParallel: 3,
      steps: [],
      parallelRunningSteps: [] // 当前正在并行执行的步骤
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

    // 新增：执行模式相关消息处理
    this.ws.on('EXECUTION_MODE_SET', (payload) => {
      this.state.executionMode = payload.mode;
      this.state.maxParallel = payload.maxParallel;
      this.updateModeSelector();
    });

    this.ws.on('EXECUTION_MODE_CHANGED', (payload) => {
      this.state.executionMode = payload.mode;
      this.state.maxParallel = payload.maxParallel;
      this.updateModeSelector();
    });

    this.ws.on('STEPS_STATUS', (payload) => {
      this.state.steps = payload.steps;
      this.renderStepsStatus();
    });

    this.ws.on('PARALLEL_STEP_STARTED', (payload) => {
      // 添加到正在运行的并行步骤列表
      if (!this.state.parallelRunningSteps.find(s => s.stepIndex === payload.stepIndex)) {
        this.state.parallelRunningSteps.push({
          stepIndex: payload.stepIndex,
          description: payload.description,
          parallelGroup: payload.parallelGroup
        });
      }
      this.renderParallelStatus();
    });

    this.ws.on('PARALLEL_STEP_COMPLETED', (payload) => {
      // 从正在运行的步骤列表中移除
      this.state.parallelRunningSteps = this.state.parallelRunningSteps.filter(
        s => s.stepIndex !== payload.stepIndex
      );
      // 更新步骤状态
      const step = this.state.steps.find(s => s.stepIndex === payload.stepIndex);
      if (step) {
        step.status = payload.status;
      }
      this.renderParallelStatus();
      this.renderStepsStatus();
    });

    this.ws.on('SCOPE_LOCK_ACQUIRED', (payload) => {
      this.showScopeLockIndicator(payload.stepIndex, true);
    });

    this.ws.on('SCOPE_LOCK_RELEASED', (payload) => {
      this.showScopeLockIndicator(payload.stepIndex, false);
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
            <div id="mode-selector" class="mode-selector">
              <label class="mode-toggle">
                <input type="checkbox" id="parallel-mode-toggle">
                <span class="toggle-slider"></span>
                <span class="toggle-label">并行执行</span>
              </label>
              <div id="max-parallel-control" class="max-parallel-control hidden">
                <label>最大并行数:</label>
                <input type="number" id="max-parallel-input" min="2" max="10" value="3">
              </div>
            </div>
          </div>
          <div id="messages-container" class="messages-container"></div>
          <div id="stage-indicator" class="stage-indicator hidden"></div>
          <div id="step-progress" class="step-progress hidden"></div>
          <!-- 新增：并行执行状态显示区域 -->
          <div id="parallel-status" class="parallel-status hidden">
            <div class="parallel-header">
              <span class="parallel-icon">⚡</span>
              <span class="parallel-title">并行执行中</span>
              <span id="parallel-count" class="parallel-count">0</span>
            </div>
            <div id="parallel-tasks" class="parallel-tasks"></div>
          </div>
          <!-- 新增：DAG步骤状态显示 -->
          <div id="dag-view" class="dag-view hidden">
            <div class="dag-header">
              <span>执行计划 (DAG)</span>
              <button id="toggle-dag-btn" class="btn-small">展开</button>
            </div>
            <div id="dag-container" class="dag-container"></div>
          </div>
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

    // 新增：执行模式选择事件
    document.getElementById('parallel-mode-toggle').addEventListener('change', (e) => {
      this.toggleParallelMode(e.target.checked);
    });

    document.getElementById('max-parallel-input').addEventListener('change', (e) => {
      this.setMaxParallel(parseInt(e.target.value, 10));
    });

    document.getElementById('toggle-dag-btn').addEventListener('click', () => {
      this.toggleDagView();
    });
  }

  // 新增：执行模式相关方法
  toggleParallelMode(enabled) {
    const mode = enabled ? 'parallel' : 'serial';
    this.state.executionMode = mode;

    // 显示/隐藏最大并行数控制
    const maxParallelControl = document.getElementById('max-parallel-control');
    if (enabled) {
      maxParallelControl.classList.remove('hidden');
    } else {
      maxParallelControl.classList.add('hidden');
    }

    // 发送模式设置到服务器
    if (this.state.selectedWorkspace) {
      this.ws.send('SET_EXECUTION_MODE', {
        workspaceId: this.state.selectedWorkspace.workspaceId,
        mode: mode,
        maxParallel: this.state.maxParallel
      });
    }
  }

  setMaxParallel(value) {
    if (value < 2 || value > 10) return;
    this.state.maxParallel = value;

    if (this.state.selectedWorkspace && this.state.executionMode === 'parallel') {
      this.ws.send('SET_EXECUTION_MODE', {
        workspaceId: this.state.selectedWorkspace.workspaceId,
        mode: 'parallel',
        maxParallel: value
      });
    }
  }

  updateModeSelector() {
    const toggle = document.getElementById('parallel-mode-toggle');
    const maxParallelControl = document.getElementById('max-parallel-control');
    const maxParallelInput = document.getElementById('max-parallel-input');

    toggle.checked = this.state.executionMode === 'parallel';
    maxParallelInput.value = this.state.maxParallel;

    if (this.state.executionMode === 'parallel') {
      maxParallelControl.classList.remove('hidden');
    } else {
      maxParallelControl.classList.add('hidden');
    }
  }

  renderParallelStatus() {
    const container = document.getElementById('parallel-status');
    const countEl = document.getElementById('parallel-count');
    const tasksEl = document.getElementById('parallel-tasks');

    if (this.state.parallelRunningSteps.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    countEl.textContent = this.state.parallelRunningSteps.length;

    tasksEl.innerHTML = this.state.parallelRunningSteps.map((step, idx) => `
      <div class="parallel-task-item" data-step-index="${step.stepIndex}">
        <span class="task-index">${idx + 1}</span>
        <span class="task-description">${this.escapeHtml(step.description)}</span>
        <span class="task-status running">运行中</span>
      </div>
    `).join('');
  }

  renderStepsStatus() {
    const container = document.getElementById('dag-container');
    if (this.state.steps.length === 0) {
      document.getElementById('dag-view').classList.add('hidden');
      return;
    }

    document.getElementById('dag-view').classList.remove('hidden');

    // 渲染DAG视图
    container.innerHTML = this.state.steps.map(step => {
      const statusClass = `status-${step.status}`;
      const dependsOnStr = step.dependsOn?.length > 0
        ? `依赖: ${step.dependsOn.join(', ')}`
        : '无依赖';
      return `
        <div class="dag-step ${statusClass}" data-step-index="${step.stepIndex}">
          <div class="step-index">${step.stepIndex + 1}</div>
          <div class="step-description">${this.escapeHtml(step.description || '步骤 ' + step.stepIndex)}</div>
          <div class="step-status">${step.status}</div>
          <div class="step-depends">${dependsOnStr}</div>
        </div>
      `;
    }).join('');
  }

  toggleDagView() {
    const container = document.getElementById('dag-container');
    const btn = document.getElementById('toggle-dag-btn');
    container.classList.toggle('collapsed');
    btn.textContent = container.classList.contains('collapsed') ? '展开' : '收起';
  }

  showScopeLockIndicator(stepIndex, locked) {
    // 在DAG视图中显示Scope锁状态
    const stepEl = document.querySelector(`.dag-step[data-step-index="${stepIndex}"]`);
    if (stepEl) {
      if (locked) {
        stepEl.classList.add('scope-locked');
      } else {
        stepEl.classList.remove('scope-locked');
      }
    }
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

    // 发送分析请求（包含执行模式）
    this.ws.send('START_ANALYSIS', {
      workspaceId: this.state.selectedWorkspace.workspaceId,
      input: message,
      mode: this.state.executionMode,
      maxParallel: this.state.maxParallel
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

## 新增样式定义

### 执行模式选择器样式
```css
.mode-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.mode-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.mode-toggle input {
  display: none;
}

.toggle-slider {
  width: 40px;
  height: 20px;
  background-color: #3A3A3A;
  border-radius: 10px;
  position: relative;
  transition: background-color 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #E8E8E8;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.mode-toggle input:checked + .toggle-slider {
  background-color: #D97757;
}

.mode-toggle input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.toggle-label {
  margin-left: 8px;
  font-size: 13px;
  color: #888888;
}

.max-parallel-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.max-parallel-control label {
  font-size: 12px;
  color: #888888;
}

.max-parallel-control input {
  width: 50px;
  padding: 4px 8px;
  background: #2A2A2A;
  border: 1px solid #3A3A3A;
  color: #E8E8E8;
  border-radius: 4px;
}
```

### 并行状态显示样式
```css
.parallel-status {
  background: #2A2A2A;
  border: 1px solid #3A3A3A;
  border-radius: 8px;
  margin: 8px 16px;
  padding: 12px;
}

.parallel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.parallel-icon {
  color: #D97757;
}

.parallel-title {
  font-weight: 600;
  color: #E8E8E8;
}

.parallel-count {
  background: #D97757;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.parallel-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.parallel-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1A1A1A;
  padding: 6px 12px;
  border-radius: 4px;
  border-left: 3px solid #D97757;
}

.task-index {
  font-weight: 600;
  color: #D97757;
}

.task-description {
  color: #E8E8E8;
  font-size: 13px;
}

.task-status.running {
  color: #4CAF50;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### DAG视图样式
```css
.dag-view {
  background: #2A2A2A;
  border: 1px solid #3A3A3A;
  border-radius: 8px;
  margin: 8px 16px;
}

.dag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #3A3A3A;
}

.dag-header span {
  font-weight: 600;
  color: #E8E8E8;
}

.dag-container {
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.dag-container.collapsed {
  display: none;
}

.dag-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: #1A1A1A;
  border-radius: 4px;
  border-left: 3px solid #3A3A3A;
}

.dag-step.status-pending {
  border-left-color: #888888;
}

.dag-step.status-running {
  border-left-color: #D97757;
  background: rgba(217, 119, 87, 0.1);
}

.dag-step.status-completed {
  border-left-color: #4CAF50;
}

.dag-step.status-failed {
  border-left-color: #F44336;
}

.dag-step.status-waiting {
  border-left-color: #FF9800;
}

.dag-step.scope-locked::after {
  content: '🔒';
  margin-left: auto;
}

.step-index {
  font-weight: 600;
  color: #D97757;
  min-width: 24px;
}

.step-description {
  flex: 1;
  color: #E8E8E8;
}

.step-status {
  font-size: 12px;
  text-transform: uppercase;
}

.step-depends {
  font-size: 11px;
  color: #888888;
}
```
```
