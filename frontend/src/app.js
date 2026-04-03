import { websocketService } from './services/websocket.js';
import { marked } from 'marked';

// 配置marked
marked.setOptions({
  breaks: true,
  gfm: true
});

// 应用状态
const state = {
  workspaces: [],
  selectedWorkspaceId: null,
  messages: [],
  stage: 'IDLE',
  currentStep: 0,
  totalSteps: 0,
  scope: null,
  charts: [],
  reports: [],
  logs: [],
  activeTab: 'scope',
  isAnalyzing: false,
  connectionStatus: 'disconnected',
  currentReportIndex: null,
  currentLogIndex: null,
  logFilter: 'all',
  pendingWorkspace: null
};

/**
 * 创建三栏布局
 */
function createLayout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      <!-- 左侧边栏 - 工作区列表 -->
      <aside class="sidebar-left">
        <div class="sidebar-header">
          <h2>工作区</h2>
          <button class="btn-new" id="btn-new-workspace" title="新建工作区">+</button>
        </div>
        <div class="workspace-list" id="workspace-list">
          <div class="loading">加载中...</div>
        </div>
      </aside>

      <!-- 中间区域 - 对话 -->
      <main class="chat-area">
        <div class="chat-header">
          <div class="header-left">
            <div class="connection-status" id="connection-status">
              <span class="status-dot"></span>
              <span class="status-text">连接中...</span>
            </div>
            <button class="btn-settings" id="btn-settings" title="设置API密钥">⚙</button>
          </div>
          <div class="header-center">
            <div class="stage-indicator" id="stage-indicator"></div>
            <div class="workflow-controls" id="workflow-controls" style="display: none;">
              <button class="btn-control" id="btn-pause" title="暂停">⏸</button>
              <button class="btn-control" id="btn-resume" title="恢复" style="display: none;">▶</button>
              <button class="btn-control stop" id="btn-stop" title="停止">⏹</button>
            </div>
          </div>
          <div class="header-right">
            <span class="loading-indicator" id="loading-indicator" style="display: none;">
              <span class="spinner"></span>
            </span>
          </div>
        </div>
        <div class="step-progress" id="step-progress">
          <div class="step-progress-bar">
            <div class="step-progress-fill" id="step-progress-fill"></div>
          </div>
          <span class="step-progress-text" id="step-progress-text"></span>
        </div>

        <div class="message-list" id="message-list">
          <div class="welcome-message">
            <h3>欢迎使用 Sherblock</h3>
            <p>区块链交易行为分析 Agent</p>
            <p class="hint">请从左侧选择一个工作区，或创建新工作区开始分析</p>
          </div>
        </div>

        <div class="input-area">
          <div class="input-wrapper">
            <textarea
              id="message-input"
              placeholder="输入您要分析的区块链地址或交易hash..."
              rows="3"
              disabled
            ></textarea>
            <button class="btn-send" id="btn-send" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">
            <span>Enter/Ctrl+Enter 发送, Shift+Enter 换行</span>
          </div>
        </div>
      </main>

      <!-- 右侧边栏 - 工作区详情 -->
      <aside class="sidebar-right">
        <div class="details-header">
          <h3>工作区详情</h3>
        </div>
        <div class="tabs" id="detail-tabs">
          <button class="tab active" data-tab="scope">Scope</button>
          <button class="tab" data-tab="charts">Charts</button>
          <button class="tab" data-tab="reports">Reports</button>
          <button class="tab" data-tab="logs">Logs</button>
        </div>
        <div class="detail-content" id="detail-content">
          <div class="empty-detail">
            <p>选择一个工作区查看详情</p>
          </div>
        </div>
      </aside>
    </div>
  `;

  // 添加全局样式
  addStyles();
}

/**
 * 添加样式
 */
function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .container {
      display: flex;
      height: 100vh;
      background: #0d0d0d;
    }

    /* 左侧边栏 */
    .sidebar-left {
      width: 280px;
      min-width: 280px;
      background: #171717;
      border-right: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #2a2a2a;
    }

    .sidebar-header h2 {
      font-size: 16px;
      font-weight: 600;
      color: #e5e5e5;
    }

    .btn-new {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: #2563eb;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .btn-new:hover {
      background: #3b82f6;
    }

    .workspace-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .workspace-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.2s;
    }

    .workspace-item:hover {
      background: #262626;
    }

    .workspace-item.active {
      background: #1e3a5f;
    }

    .workspace-item .title {
      font-size: 14px;
      font-weight: 500;
      color: #e5e5e5;
      margin-bottom: 4px;
    }

    .workspace-item .meta {
      font-size: 12px;
      color: #737373;
      display: flex;
      gap: 8px;
    }

    .workspace-item .icons {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }

    .workspace-item .icon {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .workspace-item .icon.charts { background: #065f46; color: #34d399; }
    .workspace-item .icon.reports { background: #1e3a8a; color: #60a5fa; }
    .workspace-item .icon.logs { background: #713f12; color: #fbbf24; }

    .workspace-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .workspace-item .ws-content {
      flex: 1;
      min-width: 0;
    }

    .workspace-item .btn-delete {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #525252;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .workspace-item:hover .btn-delete {
      opacity: 1;
    }

    .workspace-item .btn-delete:hover {
      background: #dc2626;
      color: white;
    }

    /* 删除确认对话框 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-overlay.hidden {
      display: none;
    }

    .modal {
      background: #171717;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
    }

    .modal h3 {
      font-size: 18px;
      color: #e5e5e5;
      margin-bottom: 12px;
    }

    .modal p {
      font-size: 14px;
      color: #a3a3a3;
      margin-bottom: 24px;
    }

    .modal-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .modal-buttons button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #262626;
      border: 1px solid #404040;
      color: #e5e5e5;
    }

    .btn-cancel:hover {
      background: #404040;
    }

    .btn-confirm-delete {
      background: #dc2626;
      border: none;
      color: white;
    }

    .btn-confirm-delete:hover {
      background: #ef4444;
    }

    /* 中间对话区域 */
    .chat-area {
      flex: 1;
      min-width: 400px;
      display: flex;
      flex-direction: column;
      background: #0d0d0d;
    }

    .chat-header {
      padding: 12px 20px;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #737373;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }

    .connection-status.connected .status-dot {
      background: #22c55e;
    }

    .stage-indicator {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      background: #262626;
      color: #a3a3a3;
    }

    .stage-indicator.COLLECTING { background: #1e3a5f; color: #60a5fa; }
    .stage-indicator.PLANNING { background: #3f2e06; color: #fbbf24; }
    .stage-indicator.EXECUTING { background: #064e3b; color: #34d399; }
    .stage-indicator.REVIEWING { background: #4c1d95; color: #a78bfa; }
    .stage-indicator.COMPLETED { background: #14532d; color: #4ade80; }

    /* 步骤进度条 */
    .step-progress {
      display: none;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #737373;
      padding: 8px 20px;
      border-bottom: 1px solid #2a2a2a;
    }

    .step-progress.active {
      display: flex;
    }

    .step-progress-bar {
      width: 120px;
      height: 4px;
      background: #262626;
      border-radius: 2px;
      overflow: hidden;
    }

    .step-progress-fill {
      height: 100%;
      background: #2563eb;
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .step-progress-text {
      min-width: 60px;
    }

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .welcome-message {
      text-align: center;
      padding: 60px 20px;
      color: #737373;
    }

    .welcome-message h3 {
      font-size: 24px;
      color: #e5e5e5;
      margin-bottom: 8px;
    }

    .welcome-message .hint {
      margin-top: 16px;
      font-size: 14px;
    }

    .message {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .message.agent .message-avatar {
      background: #2563eb;
      color: white;
    }

    .message.user .message-avatar {
      background: #404040;
      color: #e5e5e5;
    }

    .message.system .message-avatar {
      background: #525252;
      color: #d4d4d4;
    }

    .message-content {
      max-width: 70%;
      background: #171717;
      border-radius: 12px;
      padding: 12px 16px;
    }

    .message.user .message-content {
      background: #1d4ed8;
    }

    .message.system .message-content {
      background: transparent;
      color: #737373;
      font-size: 13px;
      text-align: center;
    }

    .message-header {
      font-size: 12px;
      color: #737373;
      margin-bottom: 6px;
    }

    .message.user .message-header {
      color: #93c5fd;
    }

    .message-body {
      font-size: 14px;
      line-height: 1.6;
      color: #e5e5e5;
    }

    .message-body code {
      background: #262626;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', monospace;
      font-size: 13px;
    }

    .message-body pre {
      background: #262626;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .message-body pre code {
      background: none;
      padding: 0;
    }

    /* 输入区域 */
    .input-area {
      padding: 16px 20px;
      border-top: 1px solid #2a2a2a;
    }

    .input-wrapper {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    .input-wrapper textarea {
      flex: 1;
      background: #171717;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 12px 16px;
      color: #e5e5e5;
      font-family: inherit;
      font-size: 14px;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
    }

    .input-wrapper textarea:focus {
      border-color: #3b82f6;
    }

    .input-wrapper textarea::placeholder {
      color: #525252;
    }

    .input-wrapper textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-send {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 12px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .btn-send:hover:not(:disabled) {
      background: #3b82f6;
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .input-hint {
      margin-top: 8px;
      font-size: 12px;
      color: #525252;
    }

    /* 右侧边栏 */
    .sidebar-right {
      width: 320px;
      min-width: 320px;
      background: #171717;
      border-left: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
    }

    .details-header {
      padding: 16px;
      border-bottom: 1px solid #2a2a2a;
    }

    .details-header h3 {
      font-size: 14px;
      font-weight: 600;
      color: #e5e5e5;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid #2a2a2a;
    }

    .tab {
      flex: 1;
      padding: 12px 8px;
      border: none;
      background: transparent;
      color: #737373;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      color: #a3a3a3;
    }

    .tab.active {
      color: #e5e5e5;
      border-bottom-color: #2563eb;
    }

    .detail-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .empty-detail {
      text-align: center;
      color: #525252;
      padding: 40px 20px;
    }

    .detail-view {
      font-size: 13px;
      line-height: 1.6;
    }

    .detail-view h4 {
      color: #a3a3a3;
      font-size: 12px;
      font-weight: 500;
      margin: 16px 0 8px;
    }

    .detail-view h4:first-child {
      margin-top: 0;
    }

    .detail-view pre {
      background: #0d0d0d;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }

    .chart-list, .report-list, .log-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chart-item, .report-item, .log-item {
      background: #0d0d0d;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .chart-item:hover, .report-item:hover, .log-item:hover {
      background: #262626;
    }

    .chart-item img, .chart-item svg {
      max-width: 100%;
      border-radius: 4px;
    }

    .chart-item .name, .report-item .name, .log-item .name {
      font-size: 13px;
      color: #e5e5e5;
    }

    .chart-item .time, .report-item .time, .log-item .time {
      font-size: 11px;
      color: #525252;
      margin-top: 4px;
    }

    .loading {
      text-align: center;
      color: #525252;
      padding: 20px;
    }

    .json-key { color: #9cdcfe; }
    .json-string { color: #ce9178; }
    .json-number { color: #b5cea8; }
    .json-boolean { color: #569cd6; }
    .json-null { color: #569cd6; }

    /* 搜索框样式 */
    .search-box {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .search-box input {
      flex: 1;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 8px 12px;
      color: #e5e5e5;
      font-size: 13px;
      outline: none;
    }

    .search-box input:focus {
      border-color: #3b82f6;
    }

    .search-box input::placeholder {
      color: #525252;
    }

    .search-box button {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      background: #262626;
      color: #a3a3a3;
      font-size: 12px;
      cursor: pointer;
    }

    .search-box button:hover {
      background: #404040;
    }

    /* Scope树形视图 */
    .scope-tree {
      font-family: 'Consolas', monospace;
      font-size: 12px;
    }

    .tree-node {
      margin-left: 16px;
      line-height: 1.8;
    }

    .tree-node:first-child {
      margin-left: 0;
    }

    .tree-key {
      color: #9cdcfe;
    }

    .tree-string {
      color: #ce9178;
    }

    .tree-number {
      color: #b5cea8;
    }

    .tree-boolean {
      color: #569cd6;
    }

    .tree-null {
      color: #569cd6;
    }

    .tree-toggle {
      cursor: pointer;
      color: #737373;
      margin-right: 4px;
      user-select: none;
    }

    .tree-toggle:hover {
      color: #a3a3a3;
    }

    .tree-toggle.collapsed + .tree-children {
      display: none;
    }

    /* 图表预览 */
    .chart-preview-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      padding: 40px;
    }

    .chart-preview-modal.hidden {
      display: none;
    }

    .chart-preview-modal .chart-full {
      max-width: 100%;
      max-height: 100%;
    }

    .chart-preview-modal .chart-full svg {
      max-width: 100%;
      max-height: calc(100vh - 80px);
    }

    .chart-preview-modal .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 8px;
      background: #262626;
      color: #e5e5e5;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-preview-modal .close-btn:hover {
      background: #404040;
    }

    .chart-item {
      position: relative;
    }

    .chart-item .fullscreen-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .chart-item:hover .fullscreen-btn {
      opacity: 1;
    }

    .chart-item .fullscreen-btn:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    /* 报告内容 */
    .report-content {
      background: #0d0d0d;
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
    }

    .report-content h1 { font-size: 20px; color: #e5e5e5; margin: 0 0 16px; }
    .report-content h2 { font-size: 16px; color: #e5e5e5; margin: 20px 0 12px; border-bottom: 1px solid #2a2a2a; padding-bottom: 8px; }
    .report-content h3 { font-size: 14px; color: #a3a3a3; margin: 16px 0 8px; }
    .report-content p { font-size: 13px; line-height: 1.7; color: #d4d4d4; margin: 8px 0; }
    .report-content ul, .report-content ol { margin: 8px 0; padding-left: 20px; }
    .report-content li { font-size: 13px; line-height: 1.7; color: #d4d4d4; margin: 4px 0; }
    .report-content code { background: #262626; padding: 2px 6px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 12px; }
    .report-content pre { background: #262626; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
    .report-content pre code { background: none; padding: 0; }
    .report-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    .report-content th, .report-content td { border: 1px solid #2a2a2a; padding: 8px; text-align: left; }
    .report-content th { background: #171717; color: #a3a3a3; }
    .report-content td { color: #d4d4d4; }
    .report-content a { color: #60a5fa; text-decoration: none; }
    .report-content a:hover { text-decoration: underline; }
    .report-content img { max-width: 100%; border-radius: 8px; margin: 12px 0; }

    /* 日志内容 */
    .log-content {
      background: #0d0d0d;
      border-radius: 8px;
      padding: 12px;
      font-family: 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.6;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .log-line {
      display: flex;
      gap: 8px;
    }

    .log-line.error { color: #f87171; }
    .log-line.warn { color: #fbbf24; }
    .log-line.info { color: #60a5fa; }
    .log-line.debug { color: #737373; }

    .log-time {
      color: #525252;
      flex-shrink: 0;
    }

    .log-text {
      color: #d4d4d4;
    }

    /* 筛选器 */
    .filter-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    }

    .filter-bar select {
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 6px 10px;
      color: #e5e5e5;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }

    .filter-bar select:focus {
      border-color: #3b82f6;
    }

    /* 返回按钮 */
    .back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      background: #262626;
      color: #a3a3a3;
      font-size: 12px;
      cursor: pointer;
      margin-bottom: 12px;
    }

    .back-btn:hover {
      background: #404040;
      color: #e5e5e5;
    }

    /* 头部布局 */
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-center {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-right {
      min-width: 60px;
      display: flex;
      justify-content: flex-end;
    }

    /* 设置按钮 */
    .btn-settings {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: #262626;
      color: #a3a3a3;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-settings:hover {
      background: #404040;
      color: #e5e5e5;
    }

    /* 工作流控制按钮 */
    .workflow-controls {
      display: flex;
      gap: 6px;
    }

    .btn-control {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: #262626;
      color: #a3a3a3;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-control:hover {
      background: #404040;
      color: #e5e5e5;
    }

    .btn-control.stop:hover {
      background: #dc2626;
      color: white;
    }

    /* 加载指示器 */
    .loading-indicator {
      display: flex;
      align-items: center;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #262626;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* API密钥对话框 */
    .api-key-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 13px;
      color: #a3a3a3;
    }

    .form-group input {
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 10px 12px;
      color: #e5e5e5;
      font-size: 13px;
      outline: none;
    }

    .form-group input:focus {
      border-color: #3b82f6;
    }

    .form-group input::placeholder {
      color: #525252;
    }

    .btn-save-api {
      background: #2563eb;
      border: none;
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-save-api:hover {
      background: #3b82f6;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  // 新建工作区
  document.getElementById('btn-new-workspace').addEventListener('click', createNewWorkspace);

  // 发送消息
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape' && state.isAnalyzing) {
      e.preventDefault();
      stopWorkflow();
    }
  });

  // Tab切换
  document.getElementById('detail-tabs').addEventListener('click', (e) => {
    if (e.target.classList.contains('tab')) {
      const tab = e.target.dataset.tab;
      state.activeTab = tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      renderDetailContent();
    }
  });

  // 设置按钮 - 显示API密钥配置
  document.getElementById('btn-settings').addEventListener('click', showApiKeyDialog);

  // 工作流控制按钮
  document.getElementById('btn-pause').addEventListener('click', pauseWorkflow);
  document.getElementById('btn-resume').addEventListener('click', resumeWorkflow);
  document.getElementById('btn-stop').addEventListener('click', stopWorkflow);

  // 全局快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+, 打开设置
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      showApiKeyDialog();
    }
    // Ctrl+N 新建工作区
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createNewWorkspace();
    }
  });
}

/**
 * 创建新工作区
 */
async function createNewWorkspace() {
  // 自动生成默认名称：工作区-序号
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN').replace(/\//g, '-');
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
  const name = `工作区-${dateStr}-${timeStr}`;

  showLoading(true);
  websocketService.send({
    type: 'CREATE_WORKSPACE',
    payload: { title: name }
  });
}

/**
 * 显示API密钥配置对话框
 */
function showApiKeyDialog() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>API密钥配置</h3>
      <div class="api-key-form">
        <div class="form-group">
          <label>GLM API Key</label>
          <input type="password" id="api-key-glm" placeholder="输入GLM API密钥">
        </div>
        <div class="form-group">
          <label>DeepSeek API Key</label>
          <input type="password" id="api-key-deepseek" placeholder="输入DeepSeek API密钥">
        </div>
        <div class="form-group">
          <label>Etherscan API Key</label>
          <input type="password" id="api-key-etherscan" placeholder="输入Etherscan API密钥">
        </div>
        <div class="modal-buttons">
          <button class="btn-cancel" id="btn-cancel-api">取消</button>
          <button class="btn-save-api" id="btn-save-api">保存</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 加载已保存的密钥（从localStorage）
  const savedKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
  if (savedKeys.glm) document.getElementById('api-key-glm').value = savedKeys.glm;
  if (savedKeys.deepseek) document.getElementById('api-key-deepseek').value = savedKeys.deepseek;
  if (savedKeys.etherscan) document.getElementById('api-key-etherscan').value = savedKeys.etherscan;

  // 事件处理
  document.getElementById('btn-cancel-api').addEventListener('click', () => modal.remove());
  document.getElementById('btn-save-api').addEventListener('click', () => {
    const apiKeys = {
      glm: document.getElementById('api-key-glm').value.trim(),
      deepseek: document.getElementById('api-key-deepseek').value.trim(),
      etherscan: document.getElementById('api-key-etherscan').value.trim()
    };

    // 保存到localStorage
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));

    // 发送到服务器
    websocketService.send({
      type: 'INIT',
      payload: { apiKeys }
    });

    modal.remove();
    addMessage({
      type: 'system',
      content: 'API密钥已保存',
      timestamp: new Date().toISOString()
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

/**
 * 显示/隐藏加载指示器
 */
function showLoading(show) {
  const indicator = document.getElementById('loading-indicator');
  indicator.style.display = show ? 'flex' : 'none';
}

/**
 * 更新工作流控制按钮状态
 */
function updateWorkflowControls(controlState) {
  const controls = document.getElementById('workflow-controls');
  const pauseBtn = document.getElementById('btn-pause');
  const resumeBtn = document.getElementById('btn-resume');

  if (controlState === 'running') {
    controls.style.display = 'flex';
    pauseBtn.style.display = 'flex';
    resumeBtn.style.display = 'none';
  } else if (controlState === 'paused') {
    controls.style.display = 'flex';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'flex';
  } else {
    controls.style.display = 'none';
  }
}

/**
 * 暂停工作流
 */
function pauseWorkflow() {
  if (!state.selectedWorkspaceId) return;
  websocketService.send({
    type: 'PAUSE_WORKFLOW',
    payload: { workspaceId: state.selectedWorkspaceId }
  });
  updateWorkflowControls('paused');
}

/**
 * 恢复工作流
 */
function resumeWorkflow() {
  if (!state.selectedWorkspaceId) return;
  websocketService.send({
    type: 'RESUME_WORKFLOW',
    payload: { workspaceId: state.selectedWorkspaceId }
  });
  updateWorkflowControls('running');
}

/**
 * 停止工作流
 */
function stopWorkflow() {
  if (!state.selectedWorkspaceId) return;
  websocketService.send({
    type: 'STOP_WORKFLOW',
    payload: { workspaceId: state.selectedWorkspaceId }
  });
  updateWorkflowControls('none');
  state.isAnalyzing = false;
  updateInputState();
}

/**
 * 显示删除确认对话框
 */
function showDeleteConfirm(workspaceId) {
  const workspace = state.workspaces.find(ws => ws.id === workspaceId);
  if (!workspace) return;

  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>删除工作区</h3>
      <p>确定要删除工作区「${workspace.name}」吗？此操作不可撤销。</p>
      <div class="modal-buttons">
        <button class="btn-cancel" id="btn-cancel-delete">取消</button>
        <button class="btn-confirm-delete" id="btn-confirm-delete">删除</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 事件处理
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    deleteWorkspace(workspaceId);
    modal.remove();
  });

  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * 删除工作区
 */
function deleteWorkspace(workspaceId) {
  websocketService.send({
    type: 'DELETE_WORKSPACE',
    payload: { workspaceId }
  });

  // 如果删除的是当前选中的工作区，清空选择
  if (state.selectedWorkspaceId === workspaceId) {
    state.selectedWorkspaceId = null;
    state.messages = [];
    state.scope = null;
    state.charts = [];
    state.reports = [];
    state.logs = [];
    renderMessages();
    updateInputState();
    renderDetailContent();
  }
}

/**
 * 发送消息
 */
function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (!message || state.isAnalyzing) return;

  // 添加用户消息
  addMessage({
    type: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  input.value = '';

  // 发送消息到服务器
  websocketService.send({
    type: 'START_ANALYSIS',
    payload: {
      workspaceId: state.selectedWorkspaceId,
      input: message
    }
  });

  // 设置分析状态
  state.isAnalyzing = true;
  updateInputState();
}

/**
 * 添加消息到列表
 */
function addMessage(msg) {
  state.messages.push(msg);
  renderMessages();
}

/**
 * 渲染消息列表
 */
function renderMessages() {
  const container = document.getElementById('message-list');

  if (state.messages.length === 0) {
    container.innerHTML = `
      <div class="welcome-message">
        <h3>欢迎使用 Sherblock</h3>
        <p>区块链交易行为分析 Agent</p>
        <p class="hint">请从左侧选择一个工作区，或创建新工作区开始分析</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.messages.map(msg => {
    const avatarText = msg.type === 'user' ? 'U' : (msg.agentType || 'A');
    const headerText = msg.type === 'system'
      ? msg.content
      : (msg.agentType ? `${msg.agentType} · ${formatTime(msg.timestamp)}` : `用户 · ${formatTime(msg.timestamp)}`);

    let bodyContent = msg.content;
    if (msg.type === 'agent' && msg.agentType) {
      bodyContent = renderMarkdown(msg.content);
    }

    return `
      <div class="message ${msg.type}">
        <div class="message-avatar">${avatarText}</div>
        <div class="message-content">
          <div class="message-header">${headerText}</div>
          <div class="message-body">${bodyContent}</div>
        </div>
      </div>
    `;
  }).join('');

  // 滚动到底部
  container.scrollTop = container.scrollHeight;
}

/**
 * 渲染Markdown
 */
function renderMarkdown(content) {
  return marked.parse(content);
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 更新输入框状态
 */
function updateInputState() {
  const input = document.getElementById('message-input');
  const btn = document.getElementById('btn-send');

  input.disabled = !state.selectedWorkspaceId || state.isAnalyzing;
  btn.disabled = !state.selectedWorkspaceId || state.isAnalyzing;

  if (state.isAnalyzing) {
    input.placeholder = '分析中...';
  } else if (state.selectedWorkspaceId) {
    input.placeholder = '输入您要分析的区块链地址或交易hash...';
  } else {
    input.placeholder = '请先选择一个工作区';
  }
}

/**
 * 更新连接状态
 */
function updateConnectionStatus(status) {
  state.connectionStatus = status;
  const el = document.getElementById('connection-status');
  el.className = `connection-status ${status}`;
  el.querySelector('.status-text').textContent = status === 'connected' ? '已连接' : '连接中...';
}

/**
 * 更新阶段指示器
 */
function updateStageIndicator(stage) {
  state.stage = stage;
  const el = document.getElementById('stage-indicator');
  const stageNames = {
    'IDLE': '空闲',
    'COLLECTING': '收集中',
    'PLANNING': '计划中',
    'EXECUTING': '执行中',
    'REVIEWING': '审核中',
    'COMPLETED': '已完成'
  };
  el.textContent = stageNames[stage] || stage;
  el.className = `stage-indicator ${stage}`;

  // EXECUTING阶段显示进度条，其他阶段隐藏
  const progressEl = document.getElementById('step-progress');
  if (stage === 'EXECUTING') {
    progressEl.classList.add('active');
  } else {
    progressEl.classList.remove('active');
  }
}

/**
 * 更新步骤进度
 */
function updateStepProgress(step, totalSteps) {
  state.currentStep = step;
  state.totalSteps = totalSteps;

  const fillEl = document.getElementById('step-progress-fill');
  const textEl = document.getElementById('step-progress-text');

  if (totalSteps > 0) {
    const percent = (step / totalSteps) * 100;
    fillEl.style.width = `${percent}%`;
    textEl.textContent = `步骤 ${step}/${totalSteps}`;
  } else {
    fillEl.style.width = '0%';
    textEl.textContent = '';
  }
}

/**
 * 渲染工作区列表
 */
function renderWorkspaceList() {
  const container = document.getElementById('workspace-list');

  if (state.workspaces.length === 0) {
    container.innerHTML = '<div class="loading">暂无工作区</div>';
    return;
  }

  container.innerHTML = state.workspaces.map(ws => `
    <div class="workspace-item ${ws.id === state.selectedWorkspaceId ? 'active' : ''}"
         data-id="${ws.id}">
      <div class="ws-content">
        <div class="title">${ws.name}</div>
        <div class="meta">${formatTime(ws.createdAt)}</div>
        <div class="icons">
          ${ws.charts > 0 ? '<span class="icon charts">C</span>' : ''}
          ${ws.reports > 0 ? '<span class="icon reports">R</span>' : ''}
          ${ws.logs > 0 ? '<span class="icon logs">L</span>' : ''}
        </div>
      </div>
      <button class="btn-delete" data-id="${ws.id}" title="删除工作区">×</button>
    </div>
  `).join('');

  // 添加点击事件
  container.querySelectorAll('.workspace-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete')) return;
      selectWorkspace(item.dataset.id);
    });
  });

  // 删除按钮事件
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirm(btn.dataset.id);
    });
  });
}

/**
 * 选择工作区
 */
async function selectWorkspace(workspaceId) {
  state.selectedWorkspaceId = workspaceId;
  state.messages = [];
  state.scope = null;
  state.charts = [];
  state.reports = [];
  state.logs = [];
  state.isAnalyzing = false;
  state.stage = 'IDLE';

  renderWorkspaceList();
  renderMessages();
  updateInputState();
  renderDetailContent();
  updateWorkflowControls('none');

  showLoading(true);
  // 请求工作区详情
  websocketService.send({
    type: 'GET_WORKSPACE',
    payload: { workspaceId }
  });
}

/**
 * 渲染详情内容
 */
function renderDetailContent() {
  const container = document.getElementById('detail-content');

  if (!state.selectedWorkspaceId) {
    container.innerHTML = '<div class="empty-detail"><p>选择一个工作区查看详情</p></div>';
    return;
  }

  const tab = state.activeTab;

  switch (tab) {
    case 'scope':
      renderScopeView(container);
      break;
    case 'charts':
      renderChartsView(container);
      break;
    case 'reports':
      renderReportsView(container);
      break;
    case 'logs':
      renderLogsView(container);
      break;
  }
}

/**
 * 渲染Scope视图
 */
function renderScopeView(container) {
  if (!state.scope) {
    container.innerHTML = '<div class="loading">加载中...</div>';
    return;
  }

  // 添加搜索框
  container.innerHTML = `
    <div class="detail-view">
      <h4>Scope (状态变量)</h4>
      <div class="search-box">
        <input type="text" id="scope-search" placeholder="搜索key或value...">
        <button id="scope-search-btn">搜索</button>
      </div>
      <div class="scope-tree" id="scope-tree"></div>
    </div>
  `;

  // 渲染树形结构
  const treeEl = document.getElementById('scope-tree');
  treeEl.innerHTML = renderTree(state.scope);

  // 搜索功能
  document.getElementById('scope-search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('scope-search').value.toLowerCase();
    if (keyword) {
      highlightSearch(treeEl, keyword);
    } else {
      clearHighlight(treeEl);
    }
  });

  document.getElementById('scope-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('scope-search-btn').click();
    }
  });

  // 折叠/展开功能
  treeEl.querySelectorAll('.tree-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('collapsed');
    });
  });
}

/**
 * 渲染树形结构
 */
function renderTree(data, depth = 0) {
  if (data === null) {
    return '<span class="tree-null">null</span>';
  }

  if (typeof data !== 'object') {
    return renderValue(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '<span class="tree-string">[]</span>';

    let html = '<span class="tree-toggle collapsed">▼</span>[';
    html += '<div class="tree-children">';
    data.forEach((item, index) => {
      html += `<div class="tree-node">`;
      html += `<span class="tree-number">${index}</span>: `;
      html += renderTree(item, depth + 1);
      html += `</div>`;
    });
    html += '</div>]';
    return html;
  }

  // 对象
  const keys = Object.keys(data);
  if (keys.length === 0) return '<span class="tree-string">{}</span>';

  let html = '<span class="tree-toggle collapsed">▼</span>{';
  html += '<div class="tree-children">';
  keys.forEach(key => {
    html += `<div class="tree-node">`;
    html += `<span class="tree-key">"${key}"</span>: `;
    html += renderTree(data[key], depth + 1);
    html += `</div>`;
  });
  html += '</div>}';
  return html;
}

/**
 * 渲染值
 */
function renderValue(value) {
  if (typeof value === 'string') {
    return `<span class="tree-string">"${escapeHtml(value)}"</span>`;
  }
  if (typeof value === 'number') {
    return `<span class="tree-number">${value}</span>`;
  }
  if (typeof value === 'boolean') {
    return `<span class="tree-boolean">${value}</span>`;
  }
  if (value === null) {
    return `<span class="tree-null">null</span>`;
  }
  return String(value);
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 高亮搜索结果
 */
function highlightSearch(container, keyword) {
  clearHighlight(container);

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodesToHighlight = [];

  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.toLowerCase().includes(keyword)) {
      nodesToHighlight.push(node);
    }
  }

  nodesToHighlight.forEach(node => {
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    const span = document.createElement('span');
    span.innerHTML = node.textContent.replace(regex, '<mark style="background: #fbbf24; color: #000; padding: 0 2px; border-radius: 2px;">$1</mark>');
    node.parentNode.replaceChild(span, node);
  });
}

/**
 * 清除高亮
 */
function clearHighlight(container) {
  const marks = container.querySelectorAll('mark');
  marks.forEach(mark => {
    const text = document.createTextNode(mark.textContent);
    mark.parentNode.replaceChild(text, mark);
  });
}

/**
 * 转义正则表达式
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 渲染Charts视图
 */
function renderChartsView(container) {
  if (state.charts.length === 0) {
    container.innerHTML = '<div class="empty-detail"><p>暂无图表</p></div>';
    return;
  }

  // 搜索框
  container.innerHTML = `
    <div class="detail-view">
      <div class="search-box">
        <input type="text" id="chart-search" placeholder="搜索图表...">
      </div>
      <div class="chart-list" id="chart-list">
        ${state.charts.map((chart, index) => `
          <div class="chart-item" data-index="${index}">
            <button class="fullscreen-btn" title="全屏查看">⛶</button>
            <div class="name">${chart.name}</div>
            <div class="time">${formatTime(chart.createdAt)}</div>
            ${chart.content ? `<div class="chart-preview">${chart.content}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // 搜索功能
  const searchInput = document.getElementById('chart-search');
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.toLowerCase();
    document.querySelectorAll('.chart-item').forEach(item => {
      const name = item.querySelector('.name').textContent.toLowerCase();
      item.style.display = name.includes(keyword) ? 'block' : 'none';
    });
  });

  // 全屏查看
  container.querySelectorAll('.fullscreen-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = btn.closest('.chart-item').dataset.index;
      const chart = state.charts[index];
      showChartFullscreen(chart);
    });
  });

  // 点击图表项也可以全屏
  container.querySelectorAll('.chart-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = item.dataset.index;
      const chart = state.charts[index];
      showChartFullscreen(chart);
    });
  });
}

/**
 * 全屏查看图表
 */
function showChartFullscreen(chart) {
  const modal = document.createElement('div');
  modal.className = 'chart-preview-modal';
  modal.innerHTML = `
    <button class="close-btn">×</button>
    <div class="chart-full">${chart.content || ''}</div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // ESC关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * 渲染Reports视图
 */
function renderReportsView(container) {
  if (state.reports.length === 0) {
    container.innerHTML = '<div class="empty-detail"><p>暂无报告</p></div>';
    return;
  }

  // 搜索框
  container.innerHTML = `
    <div class="detail-view">
      <div class="search-box">
        <input type="text" id="report-search" placeholder="搜索报告...">
      </div>
      <div class="report-list" id="report-list">
        ${state.reports.map((report, index) => `
          <div class="report-item" data-index="${index}" data-name="${report.name}">
            <div class="name">${report.name}</div>
            <div class="time">${formatTime(report.createdAt)}</div>
          </div>
        `).join('')}
      </div>
      <div class="report-content" id="report-content" style="display: none;"></div>
    </div>
  `;

  // 搜索功能
  const searchInput = document.getElementById('report-search');
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.toLowerCase();
    document.querySelectorAll('.report-item').forEach(item => {
      const name = item.dataset.name.toLowerCase();
      item.style.display = name.includes(keyword) ? 'block' : 'none';
    });
  });

  // 点击查看报告内容
  const reportContent = document.getElementById('report-content');
  container.querySelectorAll('.report-item').forEach(item => {
    item.addEventListener('click', async () => {
      const index = item.dataset.index;
      const report = state.reports[index];

      // 显示返回按钮
      if (!document.getElementById('back-to-reports')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'back-to-reports';
        backBtn.className = 'back-btn';
        backBtn.innerHTML = '← 返回列表';
        backBtn.addEventListener('click', () => {
          document.getElementById('report-list').style.display = 'flex';
          reportContent.style.display = 'none';
          backBtn.remove();
        });
        reportContent.parentNode.insertBefore(backBtn, reportContent);
      }

      // 隐藏列表，显示内容
      document.getElementById('report-list').style.display = 'none';
      reportContent.style.display = 'block';
      reportContent.innerHTML = '<div class="loading">加载中...</div>';

      // 获取报告内容
      if (report.content) {
        reportContent.innerHTML = `<div class="report-content">${renderMarkdown(report.content)}</div>`;
      } else {
        // 请求获取报告内容
        websocketService.send({
          type: 'GET_REPORT_CONTENT',
          payload: { workspaceId: state.selectedWorkspaceId, reportName: report.name }
        });
      }

      // 记录当前查看的报告
      state.currentReportIndex = index;
    });
  });
}

/**
 * 渲染报告内容
 */
function renderReportContent(container, content) {
  container.innerHTML = `<div class="report-content">${renderMarkdown(content)}</div>`;
}

/**
 * 渲染Logs视图
 */
function renderLogsView(container) {
  if (state.logs.length === 0) {
    container.innerHTML = '<div class="empty-detail"><p>暂无日志</p></div>';
    return;
  }

  // 筛选器和搜索
  container.innerHTML = `
    <div class="detail-view">
      <div class="filter-bar">
        <select id="log-level-filter">
          <option value="all">全部级别</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </div>
      <div class="search-box">
        <input type="text" id="log-search" placeholder="搜索日志内容...">
      </div>
      <div class="log-list" id="log-list">
        ${state.logs.map((log, index) => `
          <div class="log-item" data-index="${index}" data-name="${log.name}">
            <div class="name">${log.name}</div>
            <div class="time">${formatTime(log.createdAt)}</div>
          </div>
        `).join('')}
      </div>
      <div class="log-content" id="log-content" style="display: none;"></div>
    </div>
  `;

  // 筛选级别
  document.getElementById('log-level-filter').addEventListener('change', (e) => {
    state.logFilter = e.target.value;
    applyLogFilter();
  });

  // 搜索
  const searchInput = document.getElementById('log-search');
  searchInput.addEventListener('input', () => {
    applyLogFilter();
  });

  // 点击查看日志内容
  const logContent = document.getElementById('log-content');
  container.querySelectorAll('.log-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = item.dataset.index;
      const log = state.logs[index];

      // 显示返回按钮
      if (!document.getElementById('back-to-logs')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'back-to-logs';
        backBtn.className = 'back-btn';
        backBtn.innerHTML = '← 返回列表';
        backBtn.addEventListener('click', () => {
          document.getElementById('log-list').style.display = 'flex';
          logContent.style.display = 'none';
          backBtn.remove();
        });
        logContent.parentNode.insertBefore(backBtn, logContent);
      }

      // 隐藏列表，显示内容
      document.getElementById('log-list').style.display = 'none';
      logContent.style.display = 'block';
      logContent.innerHTML = '<div class="loading">加载中...</div>';

      // 获取日志内容
      if (log.content) {
        renderLogContent(logContent, log.content);
      } else {
        // 请求获取日志内容
        websocketService.send({
          type: 'GET_LOG_CONTENT',
          payload: { workspaceId: state.selectedWorkspaceId, logName: log.name }
        });
      }

      state.currentLogIndex = index;
    });
  });
}

/**
 * 应用日志筛选
 */
function applyLogFilter() {
  const level = document.getElementById('log-level-filter')?.value || state.logFilter;
  const keyword = document.getElementById('log-search')?.value.toLowerCase() || '';

  document.querySelectorAll('.log-item').forEach(item => {
    const name = item.dataset.name.toLowerCase();
    const matchesKeyword = !keyword || name.includes(keyword);
    item.style.display = matchesKeyword ? 'block' : 'none';
  });
}

/**
 * 渲染日志内容
 */
function renderLogContent(container, content) {
  const lines = content.split('\n');
  const html = lines.map(line => {
    let className = 'log-line';
    let time = '';

    // 解析日志行
    const timeMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
      time = timeMatch[1];
    }

    // 级别检测
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('err]')) {
      className += ' error';
    } else if (line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning')) {
      className += ' warn';
    } else if (line.toLowerCase().includes('debug')) {
      className += ' debug';
    } else {
      className += ' info';
    }

    return `<div class="${className}">
      ${time ? `<span class="log-time">${time}</span>` : ''}
      <span class="log-text">${escapeHtml(line)}</span>
    </div>`;
  }).join('');

  container.innerHTML = html;

  // 应用筛选
  applyLogFilter();
}

/**
 * 高亮JSON
 */
function highlightJSON(json) {
  return json
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>');
}

/**
 * 初始化WebSocket事件
 */
function initWebSocketEvents() {
  // 工作区事件处理
  const handleWorkspaceData = (data) => {
    // 后端返回的数据在payload中
    const payload = data.payload || data;
    const { workspaceId, scope, charts, reports, logs } = payload;
    if (workspaceId === state.selectedWorkspaceId) {
      state.scope = scope;
      state.charts = charts || [];
      state.reports = reports || [];
      state.logs = logs || [];
      renderDetailContent();
    }
  };

  websocketService.on('connected', () => {
    updateConnectionStatus('connected');
    // 请求工作区列表
    websocketService.send({ type: 'GET_WORKSPACES' });
  });

  websocketService.on('disconnected', () => {
    updateConnectionStatus('disconnected');
  });

  websocketService.on('error', (data) => {
    console.error('WebSocket error:', data);
  });

  // 工作区创建 - 记录新工作区并请求列表刷新
  websocketService.on('WORKSPACE_CREATED', (data) => {
    const payload = data.payload || data;
    const { workspaceId, title } = payload;

    // 保存新工作区信息用于后续选择
    state.pendingWorkspace = {
      id: workspaceId,
      name: title || workspaceId,
      createdAt: new Date().toISOString(),
      charts: 0,
      reports: 0,
      logs: 0
    };

    // 请求最新列表
    websocketService.send({ type: 'GET_WORKSPACES' });
  });

  // 工作区列表 - 完全同步后端列表，并处理待选择的工作区
  websocketService.on('WORKSPACES_LIST', (data) => {
    const payload = data.payload || data;
    const newWorkspaces = (payload.workspaces || []).map(ws => ({
      id: ws.workspaceId || ws.id,
      name: ws.title || ws.workspaceId || ws.id,
      createdAt: ws.createdAt,
      charts: ws.hasCharts ? 1 : 0,
      reports: ws.hasReports ? 1 : 0,
      logs: ws.hasLogs ? 1 : 0
    }));

    // 保留当前选中的工作区（如果不在新列表中）
    const selectedId = state.selectedWorkspaceId;
    const existingSelected = newWorkspaces.find(ws => ws.id === selectedId);

    if (selectedId && !existingSelected) {
      const localSelected = state.workspaces.find(ws => ws.id === selectedId);
      if (localSelected) {
        newWorkspaces.unshift(localSelected);
      }
    }

    state.workspaces = newWorkspaces;
    renderWorkspaceList();

    // 检查是否有待选择的工作区（在 WORKSPACE_CREATED 中设置）
    if (state.pendingWorkspace) {
      const exists = state.workspaces.some(ws => ws.id === state.pendingWorkspace.id);
      if (exists) {
        const ws = state.pendingWorkspace;
        state.pendingWorkspace = null;
        selectWorkspace(ws.id);
      }
    }
  });

  // 工作区删除
  websocketService.on('WORKSPACE_DELETED', (data) => {
    const payload = data.payload || data;
    const { workspaceId } = payload;
    state.workspaces = state.workspaces.filter(ws => ws.id !== workspaceId);
    renderWorkspaceList();
  });

  // 工作区详情
  websocketService.on('WORKSPACE_DETAILS', (data) => {
    showLoading(false);
    handleWorkspaceData(data);
  });

  // Agent消息
  websocketService.on('AGENT_MESSAGE', (data) => {
    const payload = data.payload || data;
    const { agent, message, stage, step, totalSteps } = payload;

    showLoading(false);

    if (stage) {
      updateStageIndicator(stage);
      // 在执行阶段显示工作流控制按钮
      if (stage === 'EXECUTING' || stage === 'PLANNING' || stage === 'COLLECTING') {
        updateWorkflowControls('running');
      }
    }

    if (typeof step === 'number' && typeof totalSteps === 'number') {
      updateStepProgress(step, totalSteps);
    }

    addMessage({
      type: 'agent',
      agentType: agent || 'Agent',
      content: message,
      timestamp: new Date().toISOString()
    });

    // 分析完成
    if (stage === 'COMPLETED') {
      state.isAnalyzing = false;
      updateInputState();
      updateWorkflowControls('none');
    }
  });

  // 步骤开始事件
  websocketService.on('STEP_STARTED', (data) => {
    const payload = data.payload || data;
    const { stepIndex, step } = payload;
    const totalSteps = state.totalSteps || (step && (step.totalSteps || (step.steps && step.steps.length)));
    updateStepProgress(stepIndex + 1, totalSteps || 0);
  });

  // 计划完成事件 - 获取总步骤数
  websocketService.on('PLANNING_COMPLETED', (data) => {
    const payload = data.payload || data;
    const { plan } = payload;
    if (plan) {
      // plan.steps 是数组（串行模式），plan.dag 是对象（并行模式）
      const totalSteps = (plan.steps && plan.steps.length) || (plan.dag && Object.keys(plan.dag).length) || 0;
      state.totalSteps = totalSteps;
    }
  });

  // 阶段变更
  websocketService.on('STAGE_CHANGED', (data) => {
    const payload = data.payload || data;
    updateStageIndicator(payload.stage);
  });

  // 工作流暂停
  websocketService.on('WORKFLOW_PAUSED', (data) => {
    const payload = data.payload || data;
    addMessage({
      type: 'system',
      content: '工作流已暂停',
      timestamp: new Date().toISOString()
    });
    updateWorkflowControls('paused');
  });

  // 工作流恢复
  websocketService.on('WORKFLOW_RESUMED', (data) => {
    const payload = data.payload || data;
    addMessage({
      type: 'system',
      content: '工作流已恢复',
      timestamp: new Date().toISOString()
    });
    updateWorkflowControls('running');
  });

  // 工作流停止
  websocketService.on('WORKFLOW_STOPPED', (data) => {
    const payload = data.payload || data;
    addMessage({
      type: 'system',
      content: '工作流已停止',
      timestamp: new Date().toISOString()
    });
    updateWorkflowControls('none');
    state.isAnalyzing = false;
    updateInputState();
  });

  // 分析完成
  websocketService.on('ANALYSIS_COMPLETED', (data) => {
    state.isAnalyzing = false;
    updateInputState();
    // 刷新工作区详情
    if (state.selectedWorkspaceId) {
      websocketService.send({
        type: 'GET_WORKSPACE',
        payload: { workspaceId: state.selectedWorkspaceId }
      });
    }
  });

  // 报告内容
  websocketService.on('REPORT_CONTENT', (data) => {
    const payload = data.payload || data;
    const { reportName, content } = payload;

    const reportContent = document.getElementById('report-content');
    if (reportContent && reportContent.style.display !== 'none') {
      reportContent.innerHTML = `<div class="report-content">${renderMarkdown(content)}</div>`;
    }
  });

  // 日志内容
  websocketService.on('LOG_CONTENT', (data) => {
    const payload = data.payload || data;
    const { logName, content } = payload;

    const logContent = document.getElementById('log-content');
    if (logContent && logContent.style.display !== 'none') {
      renderLogContent(logContent, content);
    }
  });

  // 错误
  websocketService.on('ERROR', (data) => {
    const payload = data.payload || data;
    console.error('Analysis error:', payload.error);
    state.isAnalyzing = false;
    updateInputState();
    addMessage({
      type: 'system',
      content: `错误: ${payload.error}`,
      timestamp: new Date().toISOString()
    });
  });

  // 文件变更
  websocketService.on('FILE_CHANGED', (data) => {
    const { workspaceId } = data;
    if (workspaceId === state.selectedWorkspaceId) {
      // 刷新工作区详情
      websocketService.send({
        type: 'GET_WORKSPACE',
        payload: { workspaceId }
      });
    }
  });
}

/**
 * 初始化应用
 */
export function initApp() {
  createLayout();
  initEventListeners();
  initWebSocketEvents();

  // 连接WebSocket
  websocketService.connect();
}

// 启动应用
initApp();