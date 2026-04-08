import { websocketService } from "./services/websocket.js";
import { marked } from "marked";

// Ant Design Icons SVG mappings (outline style)
const ICONS = {
    UserOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    QuestionCircleOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    MessageOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    RobotOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>',
    FlagOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
    CaretRightOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="9 18 15 12 9 6 9 18"></polygon></svg>',
    CheckCircleOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    CloseCircleOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    TrophyOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>',
    FileTextOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    ToolOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
    DownloadOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    InboxOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
    BulbOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>',
    PlayCircleOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>',
    EyeOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    SearchOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    FileOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
    PlusOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    SettingOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    PauseOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
    StopOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>',
    FullscreenOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    DeleteOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    SyncOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
    SendOutlined:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
};

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true,
});

// Application state
const state = {
    workspaces: [],
    selectedWorkspaceId: null,
    messages: [],
    workflowLogs: [], // Workflow logs (JSON format)
    isWorkflowCompleted: false, // Whether workflow is completed
    stage: "idle",
    currentStep: 0,
    totalSteps: 0,
    scope: null,
    charts: [],
    reports: [],
    logs: [],
    activeTab: "scope",
    isAnalyzing: false,
    awaitingUserInput: false, // Whether waiting for user input
    connectionStatus: "disconnected",
    currentReportIndex: null,
    currentLogIndex: null,
    logFilter: "all",
    pendingWorkspace: null,
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: false,
    autoRefreshInterval: null, // Auto-refresh timer
    lastRefreshTime: 0, // Last refresh timestamp
    // DAG floating state
    dagData: null, // Original DAG data (nodes, steps)
    dagPositionedNodes: null, // Positioned nodes after layout
    dagLayoutEdges: null, // Layout edges
    dagNodeStatuses: {}, // { stepId: "pending" | "running" | "completed" }
    dagFloatingVisible: false, // Whether floating DAG is visible
    dagCollapsed: false, // Whether DAG is collapsed
    dagViewTransform: { x: 0, y: 0, scale: 1 }, // Viewport transform state
    dagMinScale: 0.1, // Min zoom scale
    dagMaxScale: 3, // Max zoom scale
};

/**
 * Create three-column layout
 */
function createLayout() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="container">
      <!-- Left sidebar - Workspace list -->
      <aside class="sidebar-left">
        <div class="sidebar-header">
          <h2>Workspace</h2>
          <button class="btn-new" id="btn-new-workspace" title="New Workspace">+</button>
        </div>
        <div class="workspace-list" id="workspace-list">
          <div class="loading">Loading...</div>
        </div>
      </aside>

      <!-- Center area - Chat -->
      <main class="chat-area">
        <div class="chat-header">
          <div class="header-left">
            <button class="btn-collapse" id="btn-collapse-left" title="Collapse Left">‹</button>
            <div class="connection-status" id="connection-status">
              <span class="status-dot"></span>
              <span class="status-text">Connecting...</span>
            </div>
          </div>
          <div class="header-center">
            <div class="stage-indicator" id="stage-indicator"></div>
            <div class="workflow-controls" id="workflow-controls" style="display: none;">
              <button class="btn-control" id="btn-pause" title="Pause">⏸</button>
              <button class="btn-control" id="btn-resume" title="Resume" style="display: none;">▶</button>
              <button class="btn-control stop" id="btn-stop" title="Stop">⏹</button>
            </div>
          </div>
          <div class="header-right">
            <button class="btn-collapse" id="btn-collapse-right" title="Collapse Right">›</button>
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
            <h3>Welcome to Sherblock</h3>
            <p>Blockchain Transaction Analysis Agent</p>
            <p class="hint">Select a workspace from the left or create a new one to start analysis</p>
          </div>
        </div>

        <div class="input-area">
          <div class="input-wrapper">
            <textarea
              id="message-input"
              placeholder="Enter blockchain address or transaction hash to analyze..."
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
            <span>Enter/Ctrl+Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </main>

      <!-- Right sidebar - Workspace details -->
      <aside class="sidebar-right">
        <div class="details-header">
          <h3>Workspace Details</h3>
        </div>
        <div class="tabs" id="detail-tabs">
          <button class="tab active" data-tab="scope">Scope</button>
          <button class="tab" data-tab="charts">Charts</button>
          <button class="tab" data-tab="reports">Reports</button>
          <button class="tab" data-tab="logs">Logs</button>
        </div>
        <div class="detail-content" id="detail-content">
          <div class="empty-detail">
            <p>Select a workspace to view details</p>
          </div>
        </div>
      </aside>
    </div>
  `;

    // Add global styles
    addStyles();
}

/**
 * Add styles
 */
function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
    /* Custom scrollbar styles */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    ::-webkit-scrollbar-thumb {
      background: #404040;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #525252;
    }

    .container {
      display: flex;
      height: 100vh;
      background: #0d0d0d;
    }

    /* Left sidebar */
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

    /* Collapse button */
    .btn-collapse {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #737373;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-collapse:hover {
      background: #262626;
      color: #e5e5e5;
    }

    /* Sidebar collapsed state */
    .sidebar-left.collapsed {
      width: 0;
      min-width: 0;
      overflow: hidden;
      border-right: none;
    }

    .sidebar-right.collapsed {
      width: 0;
      min-width: 0;
      overflow: hidden;
      border-left: none;
    }

    .sidebar-left.collapsed .workspace-list,
    .sidebar-right.collapsed .tabs,
    .sidebar-right.collapsed .detail-content {
      display: none;
    }

    .sidebar-left.collapsed .sidebar-header {
      border-bottom: none;
    }

    .sidebar-right.collapsed .details-header {
      border-bottom: none;
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
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .status-badge.completed {
      background-color: #389e0d;
      color: #fff;
    }

    .status-badge.running {
      background-color: #096dd9;
      color: #fff;
    }

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

    /* Delete confirmation dialog */
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

    /* Center chat area */
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

    .stage-indicator.collecting { background: #1e3a5f; color: #60a5fa; }
    .stage-indicator.planning { background: #3f2e06; color: #fbbf24; }
    .stage-indicator.executing { background: #064e3b; color: #34d399; }
    .stage-indicator.reviewing { background: #4c1d95; color: #a78bfa; }
    .stage-indicator.completed { background: #14532d; color: #4ade80; }

    /* Step progress bar */
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

    .message-avatar .antd-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .message-avatar .antd-icon svg {
      width: 20px;
      height: 20px;
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
    }

    .message.error .message-avatar {
      background: #dc2626;
      color: white;
    }

    .message.error .message-content {
      background: #7f1d1d;
    }

    .message.system.completed .message-content {
      background: #064e3b;
    }

    /* Workflow log style enhancements */
    .message-body .agent-name {
      color: #93c5fd;
      font-weight: 500;
    }

    .message-body .stage-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #262626;
      color: #a3a3a3;
      font-size: 10px;
      margin-left: 4px;
    }

    .message-body .stage-change,
    .message-body .step-info {
      color: #fbbf24;
      font-weight: 500;
    }

    .message-body .error-label {
      color: #f87171;
      font-weight: 500;
    }

    .message-body .completion {
      color: #34d399;
      font-weight: 600;
    }

    /* New log type styles */
    .message-body .skill-call,
    .message-body .skill-result,
    .message-body .scope-update {
      font-weight: 500;
      color: #a78bfa;
    }

    .message-body .skill-params,
    .message-body .skill-result,
    .message-body .scope-data,
    .message-body .action-details {
      background: #1e1e1e;
      border-radius: 6px;
      padding: 8px;
      margin-top: 4px;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #d4d4d4;
    }

    .message-body .thought-label,
    .message-body .action-label,
    .message-body .observation-label {
      color: #f472b6;
      font-weight: 500;
    }

    .message-body .review-label {
      color: #38bdf8;
      font-weight: 500;
    }

    /* Plan visualization styles */
    .plan-visualization {
      width: 100%;
    }

    .plan-section {
      margin-bottom: 12px;
    }

    .plan-section-title {
      font-weight: 600;
      color: #fbbf24;
      margin-bottom: 8px;
    }

    .scope-summary {
      background: #1e1e1e;
      border-radius: 6px;
      padding: 8px;
      font-size: 12px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #d4d4d4;
    }

    .plan-flow {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .plan-step {
      display: flex;
      align-items: flex-start;
      background: #262626;
      border-radius: 8px;
      padding: 10px;
      border-left: 3px solid #fbbf24;
    }

    .plan-step .step-number {
      min-width: 24px;
      height: 24px;
      background: #fbbf24;
      color: #1e1e1e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      margin-right: 10px;
    }

    .plan-step .step-content {
      flex: 1;
    }

    .plan-step .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .plan-step .step-id {
      font-weight: 600;
      color: #fbbf24;
      font-size: 13px;
    }

    .plan-step .step-skill {
      font-size: 12px;
      color: #a78bfa;
    }

    .plan-step .step-goal {
      color: #e5e5e5;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .plan-step .step-deps {
      font-size: 11px;
      color: #737373;
    }

    /* DAG visualization styles */
    .dag-container {
      width: 100%;
      margin: 12px 0;
    }

    .dag-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .dag-scroll-area {
      width: 100%;
      max-height: 400px;
      overflow: auto;
      background: #0d0d0d;
      border-radius: 8px;
      border: 1px solid #2a2a2a;
    }

    .dag-svg {
      display: block;
      min-width: 100%;
      min-height: 100%;
    }

    .dag-node {
      cursor: pointer;
    }

    .dag-node-bg {
      fill: #1e1e1e;
      stroke: #2a2a2a;
      stroke-width: 1;
      transition: all 0.2s;
    }

    .dag-node:hover .dag-node-bg {
      fill: #262626;
      stroke: #3b82f6;
    }

    /* Node status styles */
    .dag-node-bg.completed {
      stroke: #22c55e;
      stroke-width: 2;
    }

    .dag-node-bg.running {
      stroke: #3b82f6;
      stroke-width: 2;
    }

    .dag-node-status {
      font-family: sans-serif;
    }

    /* DAG floating container */
    .dag-floating-container {
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 420px;
      max-height: 420px;
      background: #1e1e1e;
      border: 1px solid #3b82f6;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      overflow: hidden;
    }

    .dag-floating-viewport {
      width: 100%;
      height: 280px;
      overflow: hidden;
      background: #0d0d0d;
      border-radius: 4px;
    }

    .dag-floating-canvas {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dag-floating-canvas svg {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
    }

    .dag-floating-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #262626;
      border-bottom: 1px solid #3b82f6;
      font-size: 13px;
      color: #e5e5e5;
      user-select: none;
    }

    .dag-floating-header:hover {
      background: #2a2a2a;
    }

    .dag-floating-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .dag-floating-controls button {
      background: transparent;
      border: none;
      color: #a0a0a0;
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .dag-floating-controls button:hover {
      background: #3a3a3a;
      color: #e5e5e5;
    }

    .dag-floating-body {
      padding: 0;
      overflow: hidden;
      max-height: 350px;
      transition: max-height 0.3s ease, padding 0.3s ease;
    }

    .dag-floating-body.collapsed {
      max-height: 0;
      padding: 0;
      overflow: hidden;
    }

    .dag-floating-container .dag-scroll-area {
      max-height: 260px;
      overflow: auto;
    }

    .dag-floating-container .dag-svg {
      width: 100%;
      min-width: 300px;
    }

    .dag-node-id {
      font-family: 'Consolas', monospace;
    }

    .dag-node-goal {
      font-family: inherit;
    }

    .dag-node-skill {
      font-family: 'Consolas', monospace;
    }

    .dag-node-indicator {
      transition: all 0.2s;
    }

    .dag-edge {
      fill: none;
      stroke: #525252;
      stroke-width: 2;
    }

    @keyframes dag-edge-flow {
      from { stroke-dashoffset: 20; }
      to { stroke-dashoffset: 0; }
    }

    .dag-edge.active {
      stroke: #3b82f6;
      stroke-dasharray: 5, 5;
      animation: dag-edge-flow 1s linear infinite;
    }

    .dag-preview-btn {
      padding: 0 12px;
      height: 28px;
      border: 1px solid #2a2a2a;
      border-radius: 4px;
      background: #171717;
      color: #a3a3a3;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dag-preview-btn:hover {
      background: #262626;
      color: #e5e5e5;
    }

    .preview-btn {
      padding: 2px 10px;
      height: 24px;
      border: 1px solid #404040;
      border-radius: 4px;
      background: #262626;
      color: #a3a3a3;
      font-size: 11px;
      cursor: pointer;
      margin-left: 10px;
      transition: all 0.2s;
    }

    .preview-btn:hover {
      background: #404040;
      color: #e5e5e5;
    }

    .scope-preview-modal {
      width: 80vw;
      max-width: 900px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .scope-preview-content {
      flex: 1;
      overflow: auto;
      padding: 20px;
      background: #1a1a1a;
      border-radius: 0 0 8px 8px;
    }

    .scope-preview-content pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 13px;
      line-height: 1.5;
      color: #e5e5e5;
    }

    .log-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }

    .log-preview-time {
      color: #737373;
      font-size: 12px;
    }

    .dag-preview-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .dag-preview-overlay.hidden {
      display: none;
    }

    .dag-preview-modal {
      background: #171717;
      border-radius: 12px;
      width: 90vw;
      height: 90vh;
      max-width: none;
      max-height: none;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      position: relative;
    }

    .dag-preview-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: #262626;
      color: #a3a3a3;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .dag-preview-close:hover {
      background: #333;
      color: #fff;
    }

    .dag-preview-svg {
      display: block;
    }

    /* DAG Preview Toolbar */
    .dag-preview-toolbar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: #262626;
      border-bottom: 1px solid #3a3a3a;
      align-items: center;
    }

    .dag-toolbar-btn {
      width: 36px;
      height: 36px;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      background: #1e1e1e;
      color: #e5e5e5;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .dag-toolbar-btn:hover {
      background: #3a3a3a;
      border-color: #3b82f6;
    }

    .dag-zoom-level {
      color: #a0a0a0;
      font-size: 13px;
      margin-left: 12px;
    }

    .dag-preview-viewport-wrapper {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* DAG Viewport */
    .dag-viewport {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0d0d0d;
      cursor: grab;
      position: relative;
    }

    .dag-canvas {
      transform-origin: 0 0;
      will-change: transform;
    }

    .dag-canvas svg {
      display: block;
    }

    .dag-node-modal {
      background: #171717;
      border-radius: 12px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      position: relative;
    }

    .dag-node-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #2a2a2a;
    }

    .dag-node-detail-id {
      color: #fbbf24;
      font-weight: 600;
      font-size: 14px;
    }

    .dag-node-detail-skill {
      color: #a78bfa;
      font-size: 12px;
    }

    .dag-node-detail-section {
      margin-bottom: 12px;
    }

    .dag-node-detail-label {
      color: #737373;
      font-size: 11px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .dag-node-detail-content {
      color: #e5e5e5;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
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
      word-break: break-word;
      overflow-wrap: break-word;
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

    /* Input area */
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

    /* Right sidebar */
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

    /* Search box styles */
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

    /* Scope tree view */
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

    /* Chart preview */
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

    /* Report preview */
    .report-preview-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #171717;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      padding: 40px;
    }

    .report-preview-modal .report-full {
      max-width: 900px;
      max-height: 100vh;
      overflow-y: auto;
      background: #1a1a1a;
      border-radius: 12px;
      padding: 32px;
    }

    .report-preview-modal .close-btn {
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

    .report-preview-modal .close-btn:hover {
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

    /* Report content */
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

    /* Log content */
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

    /* Filter */
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

    /* Back button */
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

    /* Header layout */
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

    /* Workflow control buttons */
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

    /* Loading indicator */
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

    /* Loading indicator animations */
    @keyframes waiting-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    @keyframes stage-switch {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes step-running {
      0% { width: 0%; }
      50% { width: 70%; }
      100% { width: 100%; }
    }

    @keyframes skill-rotating {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes plan-wave {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    @keyframes completion-celebrate {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Loading indicator styles */
    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      margin: 12px 0;
      font-size: 13px;
      animation: fadeIn 0.3s ease;
    }

    .loading-indicator.waiting-input {
      background: #1e3a5f;
      color: #93c5fd;
      border: 1px solid #3b82f6;
    }

    .loading-indicator.waiting-input .spinner-icon {
      animation: waiting-pulse 1.5s ease-in-out infinite;
    }

    .loading-indicator.stage-switching {
      background: #3f2e0a;
      color: #fbbf24;
      border: 1px solid #f59e0b;
    }

    .loading-indicator.stage-switching .spinner-icon {
      animation: stage-switch 1s ease-in-out infinite;
    }

    .loading-indicator.step-running {
      background: #1e293b;
      color: #60a5fa;
      border: 1px solid #3b82f6;
    }

    .loading-indicator.skill-calling {
      background: #2e1a4a;
      color: #a78bfa;
      border: 1px solid #8b5cf6;
    }

    .loading-indicator.skill-calling .spinner-icon {
      animation: skill-rotating 2s linear infinite;
    }

    .loading-indicator.plan-generating {
      background: #1a2e2a;
      color: #34d399;
      border: 1px solid #10b981;
    }

    .loading-indicator.plan-generating .spinner-icon {
      animation: plan-wave 1s ease-in-out infinite;
    }

    .loading-indicator.workflow-completed {
      background: #064e3b;
      color: #34d399;
      border: 1px solid #10b981;
    }

    .loading-indicator.workflow-completed .spinner-icon {
      animation: completion-celebrate 1s ease-in-out;
    }

    .loading-indicator .spinner-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-indicator .progress-bar {
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      overflow: hidden;
      flex: 1;
      margin-left: 8px;
    }

    .loading-indicator .progress-fill {
      height: 100%;
      background: currentColor;
      animation: step-running 2s ease-in-out infinite;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* API key dialog */
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
 * Initialize event listeners
 */
function initEventListeners() {
    // Create new workspace
    document
        .getElementById("btn-new-workspace")
        .addEventListener("click", createNewWorkspace);

    // Left sidebar collapse
    document
        .getElementById("btn-collapse-left")
        .addEventListener("click", () => {
            state.leftSidebarCollapsed = !state.leftSidebarCollapsed;
            const sidebar = document.querySelector(".sidebar-left");
            const btn = document.getElementById("btn-collapse-left");
            if (state.leftSidebarCollapsed) {
                sidebar.classList.add("collapsed");
                btn.innerHTML = "›";
                btn.title = "Expand Left";
            } else {
                sidebar.classList.remove("collapsed");
                btn.innerHTML = "‹";
                btn.title = "Collapse Left";
            }
        });

    // Right sidebar collapse
    document
        .getElementById("btn-collapse-right")
        .addEventListener("click", () => {
            state.rightSidebarCollapsed = !state.rightSidebarCollapsed;
            const sidebar = document.querySelector(".sidebar-right");
            const btn = document.getElementById("btn-collapse-right");
            if (state.rightSidebarCollapsed) {
                sidebar.classList.add("collapsed");
                btn.innerHTML = "‹";
                btn.title = "Expand Right";
            } else {
                sidebar.classList.remove("collapsed");
                btn.innerHTML = "›";
                btn.title = "Collapse Right";
            }
        });

    // Send message
    document.getElementById("btn-send").addEventListener("click", sendMessage);
    document
        .getElementById("message-input")
        .addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendMessage();
            } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            } else if (e.key === "Escape" && state.isAnalyzing) {
                e.preventDefault();
                stopWorkflow();
            }
        });

    // Tab switch
    document.getElementById("detail-tabs").addEventListener("click", (e) => {
        if (e.target.classList.contains("tab")) {
            const tab = e.target.dataset.tab;
            state.activeTab = tab;
            document
                .querySelectorAll(".tab")
                .forEach((t) => t.classList.remove("active"));
            e.target.classList.add("active");
            renderDetailContent();
        }
    });

    // Workflow control buttons
    document
        .getElementById("btn-pause")
        .addEventListener("click", pauseWorkflow);
    document
        .getElementById("btn-resume")
        .addEventListener("click", resumeWorkflow);
    document.getElementById("btn-stop").addEventListener("click", stopWorkflow);

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        // Ctrl+, open settings (disabled)
        if ((e.ctrlKey || e.metaKey) && e.key === ",") {
            e.preventDefault();
            showApiKeyDialog();
        }
        // Ctrl+N create new workspace
        if ((e.ctrlKey || e.metaKey) && e.key === "n") {
            e.preventDefault();
            createNewWorkspace();
        }
    });
}

/**
 * Create new workspace
 */
async function createNewWorkspace() {
    // Auto-generate default name: Workspace-Date-Time
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US").replace(/\//g, "-");
    const timeStr = now
        .toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
        .replace(/:/g, "");
    const name = `Workspace-${dateStr}-${timeStr}`;

    showLoading(true);
    websocketService.send({
        type: "CREATE_WORKSPACE",
        payload: { title: name },
    });
}

/**
 * Show API key configuration dialog
 */
function showApiKeyDialog() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
    <div class="modal">
      <h3>API Key Configuration</h3>
      <div class="api-key-form">
        <div class="form-group">
          <label>DeepSeek API Key</label>
          <input type="password" id="api-key-deepseek" placeholder="Enter DeepSeek API Key">
        </div>
        <div class="form-group">
          <label>Etherscan API Key</label>
          <input type="password" id="api-key-etherscan" placeholder="Enter Etherscan API Key">
        </div>
        <div class="modal-buttons">
          <button class="btn-cancel" id="btn-cancel-api">Cancel</button>
          <button class="btn-save-api" id="btn-save-api">Save</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(modal);

    // Load saved keys from localStorage
    const savedKeys = JSON.parse(localStorage.getItem("apiKeys") || "{}");
    if (savedKeys.deepseek)
        document.getElementById("api-key-deepseek").value = savedKeys.deepseek;
    if (savedKeys.etherscan)
        document.getElementById("api-key-etherscan").value =
            savedKeys.etherscan;

    // Event handlers
    document
        .getElementById("btn-cancel-api")
        .addEventListener("click", () => modal.remove());
    document.getElementById("btn-save-api").addEventListener("click", () => {
        const apiKeys = {
            deepseek: document.getElementById("api-key-deepseek").value.trim(),
            etherscan: document
                .getElementById("api-key-etherscan")
                .value.trim(),
        };

        // Save to localStorage
        localStorage.setItem("apiKeys", JSON.stringify(apiKeys));

        // Send to server
        websocketService.send({
            type: "INIT",
            payload: { apiKeys },
        });

        modal.remove();
        addMessage({
            type: "system",
            content: "API keys saved",
            timestamp: new Date().toISOString(),
        });
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    const indicator = document.getElementById("loading-indicator");
    indicator.style.display = show ? "flex" : "none";
}

/**
 * Update workflow control button state
 */
function updateWorkflowControls(controlState) {
    const controls = document.getElementById("workflow-controls");
    const pauseBtn = document.getElementById("btn-pause");
    const resumeBtn = document.getElementById("btn-resume");

    if (controlState === "running") {
        controls.style.display = "flex";
        pauseBtn.style.display = "flex";
        resumeBtn.style.display = "none";
    } else if (controlState === "paused") {
        controls.style.display = "flex";
        pauseBtn.style.display = "none";
        resumeBtn.style.display = "flex";
    } else {
        controls.style.display = "none";
    }
}

/**
 * Pause workflow
 */
function pauseWorkflow() {
    if (!state.selectedWorkspaceId) return;
    websocketService.send({
        type: "PAUSE_WORKFLOW",
        payload: { workspaceId: state.selectedWorkspaceId },
    });
    updateWorkflowControls("paused");
}

/**
 * Resume workflow
 */
function resumeWorkflow() {
    if (!state.selectedWorkspaceId) return;
    websocketService.send({
        type: "RESUME_WORKFLOW",
        payload: { workspaceId: state.selectedWorkspaceId },
    });
    updateWorkflowControls("running");
}

/**
 * Stop workflow
 */
function stopWorkflow() {
    if (!state.selectedWorkspaceId) return;
    websocketService.send({
        type: "STOP_WORKFLOW",
        payload: { workspaceId: state.selectedWorkspaceId },
    });
    updateWorkflowControls("none");
    state.isAnalyzing = false;
    updateInputState();
}

/**
 * Show delete confirmation dialog
 */
function showDeleteConfirm(workspaceId) {
    const workspace = state.workspaces.find((ws) => ws.id === workspaceId);
    if (!workspace) return;

    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
    <div class="modal">
      <h3>Delete Workspace</h3>
      <p>Are you sure you want to delete workspace "${workspace.name}"? This action cannot be undone.</p>
      <div class="modal-buttons">
        <button class="btn-cancel" id="btn-cancel-delete">Cancel</button>
        <button class="btn-confirm-delete" id="btn-confirm-delete">Delete</button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);

    // Event handlers
    document
        .getElementById("btn-cancel-delete")
        .addEventListener("click", () => {
            modal.remove();
        });

    document
        .getElementById("btn-confirm-delete")
        .addEventListener("click", () => {
            deleteWorkspace(workspaceId);
            modal.remove();
        });

    // Click overlay to close
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * Delete workspace
 */
function deleteWorkspace(workspaceId) {
    websocketService.send({
        type: "DELETE_WORKSPACE",
        payload: { workspaceId },
    });

    // If deleting the currently selected workspace, clear selection
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
 * Send message
 */
function sendMessage() {
    const input = document.getElementById("message-input");
    const message = input.value.trim();
    if (!message) return;

    // If waiting for user input, send USER_INPUT; otherwise send START_ANALYSIS
    const isAnswer = state.awaitingUserInput;

    if (!isAnswer && state.isAnalyzing) return;

    // Add user message
    addMessage({
        type: "user",
        content: message,
        timestamp: new Date().toISOString(),
    });

    input.value = "";

    if (isAnswer) {
        // Answer question - send USER_INPUT
        // Reset completion status
        state.isWorkflowCompleted = false;

        websocketService.send({
            type: "USER_INPUT",
            payload: {
                workspaceId: state.selectedWorkspaceId,
                input: message,
            },
        });

        // Mark as analyzing, disable input again
        state.awaitingUserInput = false;
        state.isAnalyzing = true;
        updateInputState();
    } else {
        // First analysis - send START_ANALYSIS
        // Reset completion status to show input
        state.isWorkflowCompleted = false;

        websocketService.send({
            type: "START_ANALYSIS",
            payload: {
                workspaceId: state.selectedWorkspaceId,
                input: message,
            },
        });

        // Set analyzing state
        state.isAnalyzing = true;
        updateInputState();
    }
}

/**
 * Add message to list
 * 同步刷新右边栏数据
 */
function addMessage(msg) {
    state.messages.push(msg);
    renderMessages();

    // 当收到新消息时，同步刷新右边栏数据
    // 这比轮询更高效，消息更新说明工作流正在运行
    if (state.selectedWorkspaceId && state.isAnalyzing) {
        refreshRightSidebar();
    }
}

/**
 * 刷新右边栏数据
 * 向后端请求最新的 workspace 数据
 * 带节流：至少间隔1秒才发请求
 */
function refreshRightSidebar() {
    if (!state.selectedWorkspaceId) return;

    const now = Date.now();
    // 至少间隔1秒才发请求，避免频繁请求
    if (now - state.lastRefreshTime > 1000) {
        state.lastRefreshTime = now;
        websocketService.send({
            type: "GET_WORKSPACE",
            payload: { workspaceId: state.selectedWorkspaceId },
        });
    }
}

/**
 * Render message list (display workflow logs)
 */
function renderMessages() {
    const container = document.getElementById("message-list");

    // If there are workflow logs, display them
    if (state.workflowLogs && state.workflowLogs.length > 0) {
        container.innerHTML = state.workflowLogs
            .map((log) => renderWorkflowLogItem(log))
            .join("");

        // Detect loading state based on latest message
        const latestLog = state.workflowLogs[state.workflowLogs.length - 1];
        const loadingState = detectLoadingState(latestLog);

        // Add loading indicator if needed
        if (loadingState) {
            container.innerHTML += renderLoadingIndicator(loadingState);
        }

        container.scrollTop = container.scrollHeight;
        initDAGInteractions();

        // Add floating DAG container if DAG data exists
        addFloatingDAGContainer();

        return;
    }

    // Show welcome message when no logs
    container.innerHTML = `
    <div class="welcome-message">
      <h3>Welcome to Sherblock</h3>
      <p>Blockchain Transaction Behavior Analysis Agent</p>
      <p class="hint">Select a workspace from the left or create a new one to start analysis</p>
    </div>
  `;
}

/**
 * Add floating DAG container to page if DAG data exists
 */
function addFloatingDAGContainer() {
    // Remove existing floating container
    const existing = document.getElementById("dag-floating");
    if (existing) {
        existing.remove();
    }

    // Only add if DAG data exists and should be visible
    if (!state.dagFloatingVisible || !state.dagPositionedNodes || !state.dagLayoutEdges) {
        return;
    }

    // Create floating container
    const floatingHtml = renderDAGFloatingContainer(state.dagPositionedNodes, state.dagLayoutEdges);

    // Add to page
    const messageList = document.getElementById("message-list");
    if (messageList) {
        // Create a container for the floating DAG
        const wrapper = document.createElement("div");
        wrapper.id = "dag-floating-wrapper";
        wrapper.innerHTML = floatingHtml;
        wrapper.style.cssText = "position: fixed; right: 0; bottom: 0; z-index: 999; pointer-events: none;";
        wrapper.querySelector(".dag-floating-container").style.pointerEvents = "auto";
        document.body.appendChild(wrapper);
    }
}

/**
 * Initialize DAG interaction handlers
 */
function initDAGInteractions() {
    // Remove existing overlay if any
    const existingOverlay = document.querySelector(".dag-preview-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Preview button - use current state to regenerate SVG with statuses
    document.querySelectorAll(".dag-preview-btn").forEach((btn) => {
        btn.onclick = () => {
            // Always use current state to generate fresh SVG with statuses
            let svgContent;
            if (!state.dagPositionedNodes || !state.dagLayoutEdges) {
                // Fallback to data attribute for backward compatibility
                const container = btn.closest(".dag-container");
                const svgData = container?.dataset.dagSvg;
                if (!svgData) return;
                svgContent = decodeURIComponent(svgData);
            } else {
                // Regenerate SVG with current node statuses
                svgContent = generateSVG(state.dagPositionedNodes, state.dagLayoutEdges, {}, state.dagNodeStatuses);
            }

            // Create overlay
            const overlay = document.createElement("div");
            overlay.className = "dag-preview-overlay";
            overlay.innerHTML = `
        <div class="dag-preview-modal">
          <button class="dag-preview-close">&times;</button>
          ${svgContent}
        </div>
      `;
            document.body.appendChild(overlay);

            // Adjust SVG for preview
            const svg = overlay.querySelector(".dag-svg");
            if (svg) {
                svg.classList.add("dag-preview-svg");
                const viewBox = svg.viewBox.baseVal;
                if (viewBox.width && viewBox.height) {
                    const aspect = viewBox.width / viewBox.height;
                    if (aspect > 1) {
                        svg.style.width = "80vw";
                        svg.style.height = "auto";
                    } else {
                        svg.style.height = "80vh";
                        svg.style.width = "auto";
                    }
                }
            }

            // Re-attach node click handlers for preview
            initDAGNodeClick(overlay);

            // Close handler
            overlay.querySelector(".dag-preview-close").onclick = () =>
                overlay.remove();
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };
        };
    });

    // Node click handlers for inline SVG
    initDAGNodeClick(document);
}

/**
 * Initialize DAG node click handlers
 * @param {Element|Document} parent - Parent element to search for nodes
 */
function initDAGNodeClick(parent) {
    parent.querySelectorAll(".dag-node").forEach((node) => {
        node.style.cursor = "pointer";
        node.onclick = (e) => {
            e.stopPropagation();
            const nodeData = node.dataset.node;
            if (!nodeData) return;

            const data = JSON.parse(decodeURIComponent(nodeData));

            // Create detail overlay
            const overlay = document.createElement("div");
            overlay.className = "dag-preview-overlay";
            overlay.innerHTML = `
        <div class="dag-node-modal">
          <button class="dag-preview-close">&times;</button>
          <div class="dag-node-detail">
            <div class="dag-node-detail-header">
              <span class="dag-node-detail-id">${escapeHtml(data.id)}</span>
              <span class="dag-node-detail-skill">${escapeHtml(data.skill)}</span>
            </div>
            <div class="dag-node-detail-section">
              <div class="dag-node-detail-label">Goal</div>
              <div class="dag-node-detail-content">${escapeHtml(data.goal)}</div>
            </div>
            ${
                data.depends_on.length > 0
                    ? `
              <div class="dag-node-detail-section">
                <div class="dag-node-detail-label">Dependencies</div>
                <div class="dag-node-detail-content">${data.depends_on.map((d) => escapeHtml(d)).join(", ")}</div>
              </div>
            `
                    : ""
            }
            ${
                data.success_criteria
                    ? `
              <div class="dag-node-detail-section">
                <div class="dag-node-detail-label">Success Criteria</div>
                <div class="dag-node-detail-content">${escapeHtml(data.success_criteria)}</div>
              </div>
            `
                    : ""
            }
          </div>
        </div>
      `;
            document.body.appendChild(overlay);

            overlay.querySelector(".dag-preview-close").onclick = () =>
                overlay.remove();
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };
        };
    });
}

/**
 * Render SVG icon
 */
function renderIcon(iconName, props = {}) {
    const svg = ICONS[iconName];
    if (svg) {
        const style = props.style || "";
        return `<span class="antd-icon" style="${style}">${svg}</span>`;
    }
    return "";
}

/**
 * Render workflow log entry
 */
function renderWorkflowLogItem(log) {
    const time = new Date(log.timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    let icon = "";
    let className = "message";
    let content = "";

    switch (log.type) {
        case "user_input":
            icon = renderIcon("UserOutlined");
            className += " user";
            content = escapeHtml(log.content);
            break;

        case "agent_question":
            icon = renderIcon("QuestionCircleOutlined");
            className += " agent";
            content = `<span class="agent-name">${log.agent}:</span> ${escapeHtml(log.content)}`;
            break;

        case "user_answer":
            icon = renderIcon("MessageOutlined");
            className += " user";
            content = escapeHtml(log.content);
            break;

        case "agent_message":
            icon = renderIcon("RobotOutlined");
            className += " agent";
            const stageBadge = log.stage
                ? `<span class="stage-badge">${log.stage}</span>`
                : "";
            content = `<span class="agent-name">${log.agent}</span> ${stageBadge}: ${escapeHtml(log.content)}`;
            break;

        case "stage_change":
            icon = renderIcon("FlagOutlined");
            className += " system";
            content = `<span class="stage-change">Stage Change:</span> ${log.from} → ${log.to}`;
            break;

        case "step_started":
            icon = renderIcon("CaretRightOutlined");
            className += " system";
            const startedStepName = log.stepName || log.step_name || "";
            // 优先使用 step_id 匹配节点，其次使用 stepName
            const startedStepId = log.step_id || "";
            content = `<span class="step-info">Step Started:</span>${escapeHtml(startedStepName)}`;
            // Update DAG node status to running
            updateDAGNodeStatus(startedStepId || startedStepName, "running");
            break;

        case "step_completed":
            icon = renderIcon("CheckCircleOutlined");
            className += " system";
            const completedStepName = log.stepName || log.step_name || "";
            // 优先使用 step_id 匹配节点，其次使用 stepName
            const completedStepId = log.step_id || "";
            content = `<span class="step-info">Step Completed:</span>${escapeHtml(completedStepName)}`;
            // Update DAG node status to completed
            updateDAGNodeStatus(completedStepId || completedStepName, "completed");
            break;

        case "error":
            icon = renderIcon("CloseCircleOutlined");
            className += " error";
            content = `<span class="error-label">Error:</span> ${escapeHtml(log.error)}`;
            break;

        case "workflow_completed":
            icon = renderIcon("TrophyOutlined");
            className += " system completed";
            content = `<span class="completion">Analysis Completed</span>`;
            break;

        case "plan_generated":
            icon = renderIcon("FileTextOutlined");
            className += " system";
            content = renderPlanVisualization(log);
            break;

        case "skill_call":
            icon = renderIcon("ToolOutlined");
            className += " system";
            content = `<span class="skill-call">Calling Skill:</span> <code>${escapeHtml(log.skill)}</code><pre class="skill-params">${escapeHtml(JSON.stringify(log.params, null, 2))}</pre>`;
            break;

        case "skill_result":
            icon = renderIcon("DownloadOutlined");
            className += " system";
            const successIcon =
                log.success !== false
                    ? renderIcon("CheckCircleOutlined")
                    : renderIcon("CloseCircleOutlined");
            content = `<span class="skill-result">${successIcon} Skill Result [${escapeHtml(log.skill)}]:</span><pre class="skill-result">${escapeHtml(JSON.stringify(log.summary, null, 2))}</pre>`;
            break;

        case "scope_update":
            icon = renderIcon("InboxOutlined");
            className += " system";
            content = `<span class="scope-update">Update Scope${log.stepId ? ` (${escapeHtml(log.stepId)})` : ""}:</span><pre class="scope-data">${escapeHtml(JSON.stringify(log.updates, null, 2))}</pre>`;
            break;

        case "step_thought":
            icon = renderIcon("BulbOutlined");
            className += " system";
            content = `<span class="thought-label">Thought:</span> ${escapeHtml(log.content)}`;
            break;

        case "step_action":
            icon = renderIcon("PlayCircleOutlined");
            className += " system";
            content = `<span class="action-label">Action:</span> <code>${escapeHtml(log.action)}</code><pre class="action-details">${escapeHtml(JSON.stringify(log.details, null, 2))}</pre>`;
            break;

        case "step_observation":
            icon = renderIcon("EyeOutlined");
            className += " system";
            content = `<span class="observation-label">Observation:</span> ${escapeHtml(log.content)}`;
            break;

        case "review_result":
            icon = renderIcon("SearchOutlined");
            className += " system";
            content = `<span class="review-label">Review Result:</span> [${escapeHtml(log.assessment)}] ${escapeHtml(log.decision)} - ${escapeHtml(log.reason || "")}`;
            break;

        default:
            icon = renderIcon("FileOutlined");
            content = escapeHtml(JSON.stringify(log));
    }

    const avatarText = icon;

    return `
    <div class="${className}">
      <div class="message-avatar">${avatarText}</div>
      <div class="message-content">
        <div class="message-header">${time}</div>
        <div class="message-body">${content}</div>
      </div>
    </div>
  `;
}

/**
 * Detect loading state based on latest message type
 * @param {object} latestLog - Latest workflow log entry
 * @returns {object|null} Loading state object or null
 */
function detectLoadingState(latestLog) {
    if (!latestLog) return null;

    // Don't show loading indicator if workflow is completed
    if (latestLog.type === "workflow_completed") {
        return null;
    }

    switch (latestLog.type) {
        case "agent_question":
            return {
                type: "waiting-input",
                message: "Waiting for your input...",
                icon: "QuestionCircleOutlined"
            };

        case "stage_change":
            return {
                type: "stage-switching",
                message: `Switching stage: ${latestLog.from} → ${latestLog.to}`,
                icon: "FlagOutlined"
            };

        case "step_started":
            return {
                type: "step-running",
                message: `Executing step: ${latestLog.stepName || latestLog.step_name || "Processing..."}`,
                icon: "LoadingOutlined"
            };

        case "skill_call":
            return {
                type: "skill-calling",
                message: `Calling skill: ${latestLog.skill}`,
                icon: "ToolOutlined"
            };

        case "plan_generated":
            return {
                type: "plan-generating",
                message: "Generating analysis plan...",
                icon: "FileTextOutlined"
            };

        default:
            // Show default loading if analyzing
            if (state.isAnalyzing) {
                return {
                    type: "step-running",
                    message: "Processing...",
                    icon: "LoadingOutlined"
                };
            }
            return null;
    }
}

/**
 * Render loading indicator based on current state
 * @param {object} loadingState - Loading state object
 * @returns {string} HTML string for loading indicator
 */
function renderLoadingIndicator(loadingState) {
    const iconSvg = renderIcon(loadingState.icon);

    let extraContent = "";

    switch (loadingState.type) {
        case "step-running":
        case "plan-generating":
            extraContent = `
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
            break;

        case "workflow-completed":
            extraContent = `<span style="margin-left: 8px;">🎉</span>`;
            break;
    }

    return `
        <div class="loading-indicator ${loadingState.type}">
            <span class="spinner-icon">${iconSvg}</span>
            <span>${loadingState.message}</span>
            ${extraContent}
        </div>
    `;
}

/**
 * Render Markdown
 * @param {string} content - markdown content
 * @param {string} workspaceId - workspace ID for converting image paths
 */
function renderMarkdown(content, workspaceId) {
    // Convert relative paths to API URLs
    if (workspaceId && content) {
        content = content.replace(
            /\.\.\/charts\/(\S+\.svg)/g,
            `/api/workspace/${workspaceId}/file/charts/$1`,
        );
    }
    return marked.parse(content);
}

/**
 * ===========================================
 * DAG Visualization Functions
 * ===========================================
 */

/**
 * Compute layer for each node (topological sort based on dependencies)
 * @param {Object} nodes - Nodes object with depends_on arrays
 * @returns {Object} - Map of nodeId to layer number
 */
function computeLayers(nodes) {
    const layers = {};
    const memo = {};

    const computeLayer = (nodeId) => {
        if (memo[nodeId] !== undefined) return memo[nodeId];

        const node = nodes[nodeId];
        if (!node || !node.depends_on || node.depends_on.length === 0) {
            memo[nodeId] = 0;
            return 0;
        }

        const maxDepLayer = Math.max(
            ...node.depends_on.map((d) => (nodes[d] ? computeLayer(d) : -1)),
        );

        memo[nodeId] = maxDepLayer + 1;
        return maxDepLayer + 1;
    };

    Object.keys(nodes).forEach((id) => {
        layers[id] = computeLayer(id);
    });

    return layers;
}

/**
 * Compute DAG layout using layered layout algorithm
 * @param {Object} nodes - Nodes object
 * @param {Object} options - Layout options
 * @returns {Object} - Positioned nodes
 */
function computeDAGLayout(nodes, options = {}) {
    const {
        nodeWidth = 220,
        nodeHeight = 90,
        horizontalGap = 80,
        verticalGap = 20,
    } = options;

    // Compute layers
    const layers = computeLayers(nodes);

    // Group nodes by layer
    const layerMap = {};
    Object.entries(nodes).forEach(([id, node]) => {
        const layer = layers[id] || 0;
        if (!layerMap[layer]) layerMap[layer] = [];
        layerMap[layer].push({ id, ...node });
    });

    // Calculate positions
    const positionedNodes = {};
    const layerCount = Object.keys(layerMap).length;

    Object.entries(layerMap).forEach(([layerIdx, nodesAtLayer]) => {
        const layer = parseInt(layerIdx);
        const x = layer * (nodeWidth + horizontalGap) + 40;

        // Center nodes vertically
        const totalHeight =
            nodesAtLayer.length * nodeHeight +
            (nodesAtLayer.length - 1) * verticalGap;
        const maxLayerHeight =
            layerCount * nodeHeight + (layerCount - 1) * verticalGap;
        const startY = (maxLayerHeight - totalHeight) / 2 + 20;

        nodesAtLayer.forEach((node, index) => {
            positionedNodes[node.id] = {
                ...node,
                x,
                y: startY + index * (nodeHeight + verticalGap),
                layer,
                rank: index,
            };
        });
    });

    return positionedNodes;
}

/**
 * Build edges from nodes' depends_on field
 * @param {Object} nodes - Original nodes
 * @param {Object} positionedNodes - Positioned nodes
 * @returns {Array} - Edge arrays with coordinates
 */
function buildEdgesFromNodes(nodes, positionedNodes) {
    const edges = [];
    const nodeWidth = 220;
    const nodeHeight = 90;

    Object.entries(nodes).forEach(([id, node]) => {
        const deps = node.depends_on || [];
        deps.forEach((depId) => {
            if (positionedNodes[depId] && positionedNodes[id]) {
                const fromNode = positionedNodes[depId];
                const toNode = positionedNodes[id];
                edges.push({
                    from: depId,
                    to: id,
                    fromX: fromNode.x + nodeWidth,
                    fromY: fromNode.y + nodeHeight / 2,
                    toX: toNode.x,
                    toY: toNode.y + nodeHeight / 2,
                });
            }
        });
    });

    return edges;
}

/**
 * Compute serial layout for steps without DAG dependencies
 * @param {Array} steps - Steps array
 * @param {Object} options - Layout options
 * @returns {Object} - Positioned nodes and edges
 */
function computeSerialLayout(steps, options = {}) {
    const { nodeWidth = 220, nodeHeight = 90, verticalGap = 20 } = options;

    const nodes = {};
    const edges = [];

    steps.forEach((step, index) => {
        const id = step.step_id || `step_${index + 1}`;
        nodes[id] = {
            ...step,
            x: 40,
            y: index * (nodeHeight + verticalGap) + 20,
            layer: 0,
            rank: index,
        };

        if (index > 0) {
            const prevId = steps[index - 1].step_id || `step_${index}`;
            edges.push({
                from: prevId,
                to: id,
                fromX: 40 + nodeWidth,
                fromY:
                    (index - 1) * (nodeHeight + verticalGap) +
                    20 +
                    nodeHeight / 2,
                toX: 40,
                toY: index * (nodeHeight + verticalGap) + 20 + nodeHeight / 2,
            });
        }
    });

    return { nodes, edges };
}

/**
 * Generate edge path using bezier curve
 * @param {Object} edge - Edge with coordinates
 * @returns {string} - SVG path string
 */
function generateEdgePath(edge) {
    const { fromX, fromY, toX, toY } = edge;
    const deltaX = toX - fromX;
    const controlOffset = Math.min(Math.abs(deltaX) / 2, 80);

    return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
}

/**
 * Render node as SVG group
 * @param {Object} node - Node with position and data
 * @returns {string} - SVG group string
 */
function renderNodeSVG(node, status = "pending") {
    const { id, x, y, goal, skill, depends_on = [], success_criteria } = node;
    const width = 220;
    const height = 90;

    const displayGoal =
        goal?.length > 35 ? goal.substring(0, 32) + "..." : goal || "";
    const displaySkill = skill || "";

    // Determine status class and icon
    const statusClass = status === "completed" ? "completed" : status === "running" ? "running" : "";
    const statusIcon = status === "completed" ? "✓" : status === "running" ? "⟳" : "";

    // Store full info in data attribute for click handler
    const nodeData = encodeURIComponent(
        JSON.stringify({
            id,
            goal: goal || "",
            skill: displaySkill,
            depends_on,
            success_criteria: success_criteria || "",
            status,
        }),
    );

    return `<g class="dag-node" data-id="${escapeHtml(id)}" data-node="${nodeData}" transform="translate(${x}, ${y})">
    <rect class="dag-node-bg ${statusClass}" x="0" y="0" width="${width}" height="${height}" rx="8"/>
    <text class="dag-node-id" x="12" y="22" fill="#fbbf24" font-size="12" font-weight="600">${escapeHtml(id)}</text>
    <text class="dag-node-goal" x="12" y="48" fill="#e5e5e5" font-size="13">${escapeHtml(displayGoal)}</text>
    ${displaySkill ? `<text class="dag-node-skill" x="12" y="72" fill="#a78bfa" font-size="11">${escapeHtml(displaySkill)}</text>` : ""}
    ${statusIcon ? `<text class="dag-node-status" x="200" y="20" fill="${status === "completed" ? "#22c55e" : "#3b82f6"}" font-size="16" font-weight="bold">${statusIcon}</text>` : ""}
  </g>`;
}

/**
 * Generate SVG with nodes and edges
 * @param {Object} nodes - Positioned nodes
 * @param {Array} edges - Edge arrays
 * @param {Object} options - Layout options
 * @param {Object} nodeStatuses - Node status map { stepId: status }
 * @returns {string} - SVG string
 */
function generateSVG(nodes, edges, options, nodeStatuses = {}) {
    const { nodeWidth = 220, nodeHeight = 90 } = options;

    const nodeValues = Object.values(nodes);
    if (nodeValues.length === 0) {
        return '<div class="empty-plan">No nodes to display</div>';
    }

    const maxX = Math.max(...nodeValues.map((n) => n.x)) + nodeWidth + 40;
    const maxY = Math.max(...nodeValues.map((n) => n.y)) + nodeHeight + 40;

    let svg = `<svg class="dag-svg" width="${maxX}" height="${maxY}" style="display:block;">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#525252"/>
      </marker>
    </defs>`;

    // Render edges
    edges.forEach((edge) => {
        const path = generateEdgePath(edge);
        svg += `<path class="dag-edge" d="${path}" marker-end="url(#arrowhead)"/>`;
    });

    // Render nodes with status
    nodeValues.forEach((node) => {
        const status = nodeStatuses[node.id] || "pending";
        svg += renderNodeSVG(node, status);
    });

    svg += "</svg>";
    return svg;
}

/**
 * Calculate DAG bounding box and optimal scale to fit container
 * @param {Object} nodes - Positioned nodes
 * @param {number} containerWidth - Container width
 * @param {number} containerHeight - Container height
 * @returns {Object} - { width, height, scale, x, y }
 */
function calculateDAGScale(nodes, containerWidth, containerHeight) {
    const nodeValues = Object.values(nodes);
    if (nodeValues.length === 0) {
        return { width: containerWidth, height: containerHeight, scale: 1, x: 0, y: 0 };
    }

    const nodeWidth = 220;
    const nodeHeight = 90;
    const padding = 40;

    // Calculate actual DAG dimensions
    const dagWidth = Math.max(...nodeValues.map((n) => n.x)) + nodeWidth + padding * 2;
    const dagHeight = Math.max(...nodeValues.map((n) => n.y)) + nodeHeight + padding * 2;

    // Calculate scale to fit container - always scale to fit (放大或缩小)
    const scaleX = (containerWidth - padding * 2) / dagWidth;
    const scaleY = (containerHeight - padding * 2) / dagHeight;
    const scale = Math.min(scaleX, scaleY); // 总是缩放到适应容器

    return {
        width: dagWidth,
        height: dagHeight,
        scale: Math.max(scale, 0.1), // Min scale 10%
        x: (containerWidth - dagWidth * scale) / 2,
        y: (containerHeight - dagHeight * scale) / 2,
    };
}

/**
 * Generate SVG with scaling transform for mini map display
 * @param {Object} nodes - Positioned nodes
 * @param {Array} edges - Edge arrays
 * @param {Object} nodeStatuses - Node status map
 * @param {number} containerWidth - Container width for scaling
 * @param {number} containerHeight - Container height for scaling
 * @returns {string} - HTML string with scaled SVG
 */
function generateScaledSVG(nodes, edges, nodeStatuses, containerWidth, containerHeight) {
    const scaleInfo = calculateDAGScale(nodes, containerWidth, containerHeight);
    const svgContent = generateSVG(nodes, edges, {}, nodeStatuses);

    // Extract SVG and modify to fit container using viewBox
    const svgMatch = svgContent.match(/<svg[^>]*>/);
    if (!svgMatch) return svgContent;

    const svgTag = svgMatch[0];
    // Use viewBox for automatic scaling - set viewBox to DAG dimensions
    // and set width/height to container dimensions
    const newSvgTag = `<svg class="dag-svg" width="${containerWidth}" height="${containerHeight}" viewBox="0 0 ${scaleInfo.width} ${scaleInfo.height}" style="display:block;">`;

    return svgContent.replace(svgTag, newSvgTag);
}

/**
 * Render DAG visualization
 * @param {Object} log - Plan log with steps/nodes/edges
 * @returns {string} - HTML string
 */
function renderDAGVisualization(log) {
    const steps = log.steps || [];
    const nodes = log.nodes || {};

    const hasDAG = Object.keys(nodes).length > 0;
    const isSerial = steps.length > 0 && !hasDAG;

    let positionedNodes, layoutEdges;

    if (hasDAG) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            horizontalGap: 80,
            verticalGap: 20,
        };
        positionedNodes = computeDAGLayout(nodes, layoutOptions);
        layoutEdges = buildEdgesFromNodes(nodes, positionedNodes);
    } else if (isSerial) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            verticalGap: 20,
        };
        const layout = computeSerialLayout(steps, layoutOptions);
        positionedNodes = layout.nodes;
        layoutEdges = layout.edges;
    }

    if (!positionedNodes || Object.keys(positionedNodes).length === 0) {
        return '<div class="empty-plan">No plan to display</div>';
    }

    // Store DAG data in state for floating container and status updates
    state.dagData = { nodes, steps };
    state.dagPositionedNodes = positionedNodes;
    state.dagLayoutEdges = layoutEdges;
    state.dagFloatingVisible = true;

    // Calculate scale to fit message container width
    const nodeValues = Object.values(positionedNodes);
    const nodeWidth = 220, nodeHeight = 90;
    const maxCol = Math.max(...nodeValues.map((n) => n.layer || 0)) + 1;
    const maxRow = Math.max(...nodeValues.map((n) => {
        const layerNodes = nodeValues.filter(nd => (nd.layer || 0) === (n.layer || 0));
        return layerNodes.indexOf(n);
    }), 0) + 1;

    const dagWidth = maxCol * nodeWidth + (maxCol - 1) * 80 + 80;
    const dagHeight = maxRow * nodeHeight + (maxRow - 1) * 20 + 80;

    // Use a reasonable container width estimate for message area
    const containerWidth = 600;
    const scale = Math.min(1, containerWidth / dagWidth);

    // Generate scaled SVG for message bar display
    const scaledSvg = generateScaledSVG(positionedNodes, layoutEdges, state.dagNodeStatuses, containerWidth, dagHeight);

    // Return inline DAG - click to open preview modal (for message list display)
    return `<div class="dag-container" onclick="showDAGPreview()" data-dag-svg='${encodeURIComponent(generateSVG(positionedNodes, layoutEdges, {}, state.dagNodeStatuses))}'>
    <div class="dag-scroll-area" style="overflow: hidden;">
      ${scaledSvg}
    </div>
  </div>`;
}

/**
 * Render floating DAG container (always visible after plan is generated)
 * @param {Object} positionedNodes - Positioned nodes
 * @param {Array} layoutEdges - Layout edges
 * @returns {string} - HTML string
 */
function renderDAGFloatingContainer(positionedNodes, layoutEdges) {
    // Generate scaled SVG to fit floating container (420x280 minus header ~40px = 240px height)
    const floatingWidth = 400;
    const floatingHeight = 230;
    const svg = generateScaledSVG(positionedNodes, layoutEdges, state.dagNodeStatuses, floatingWidth, floatingHeight);
    const collapsedClass = state.dagCollapsed ? "collapsed" : "";
    const collapseIcon = state.dagCollapsed ? "▶" : "▼";
    const collapseTitle = state.dagCollapsed ? "Expand" : "Collapse";
    const stepCount = Object.keys(positionedNodes).length;
    const completedCount = Object.values(state.dagNodeStatuses).filter(s => s === "completed").length;

    return `<div class="dag-floating-container" id="dag-floating" onclick="showDAGPreview()">
    <div class="dag-floating-header">
      <span>📋 Execution Plan (${completedCount}/${stepCount} completed)</span>
      <div class="dag-floating-controls">
        <button class="dag-floating-collapse-btn" onclick="toggleDAGCollapse(); event.stopPropagation();" title="${collapseTitle}">${collapseIcon}</button>
      </div>
    </div>
    <div class="dag-floating-body ${collapsedClass}">
      <div class="dag-floating-viewport">
        <div class="dag-floating-canvas">
          ${svg}
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Create DAG viewport HTML with transform support
 * @param {string} svgContent - SVG string
 * @param {Object} transform - Transform state {x, y, scale}
 * @returns {string} - HTML string
 */
function createDAGViewport(svgContent, transform) {
    return `<div class="dag-viewport" data-transform='${JSON.stringify(transform)}'>
    <div class="dag-canvas" style="transform: translate(${transform.x}px, ${transform.y}px) scale(${transform.scale});">
        ${svgContent}
    </div>
</div>`;
}

/**
 * Initialize viewport drag and zoom interactions
 * @param {HTMLElement} viewport - Viewport element
 * @returns {Object} - Viewport API
 */
function initDAGViewportInteractions(viewport) {
    const canvas = viewport.querySelector('.dag-canvas');
    const transform = {
        x: state.dagViewTransform?.x || 0,
        y: state.dagViewTransform?.y || 0,
        scale: state.dagViewTransform?.scale || 1,
        minScale: state.dagMinScale || 0.1,
        maxScale: state.dagMaxScale || 3
    };

    let isDragging = false;
    let startX, startY;
    let rafId = null;

    function updateTransform() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            canvas.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
        });
    }

    // Mouse down - start drag
    viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.dag-node')) return;
        isDragging = true;
        startX = e.clientX - transform.x;
        startY = e.clientY - transform.y;
        viewport.style.cursor = 'grabbing';
    });

    // Mouse move - dragging
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        transform.x = e.clientX - startX;
        transform.y = e.clientY - startY;
        updateTransform();
    });

    // Mouse up - end drag
    document.addEventListener('mouseup', () => {
        isDragging = false;
        viewport.style.cursor = 'grab';
    });

    // Wheel zoom
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(transform.maxScale, Math.max(transform.minScale, transform.scale * delta));

        // Zoom centered on mouse position
        transform.x = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        transform.y = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
        transform.scale = newScale;

        updateTransform();

        // Dispatch event for zoom level display
        viewport.dispatchEvent(new CustomEvent('dag-zoom-change', { detail: transform }));
    }, { passive: false });

    // Save transform to state
    function saveState() {
        state.dagViewTransform = { x: transform.x, y: transform.y, scale: transform.scale };
    }

    return {
        getTransform: () => ({ ...transform }),
        setTransform: (t) => { Object.assign(transform, t); updateTransform(); saveState(); },
        zoomIn: () => {
            transform.scale = Math.min(transform.maxScale, transform.scale * 1.2);
            updateTransform();
            saveState();
            viewport.dispatchEvent(new CustomEvent('dag-zoom-change', { detail: transform }));
        },
        zoomOut: () => {
            transform.scale = Math.max(transform.minScale, transform.scale / 1.2);
            updateTransform();
            saveState();
            viewport.dispatchEvent(new CustomEvent('dag-zoom-change', { detail: transform }));
        },
        fitToWindow: () => {
            const svgEl = canvas.querySelector('svg');
            if (!svgEl) return;
            const svgWidth = parseFloat(svgEl.getAttribute('width'));
            const svgHeight = parseFloat(svgEl.getAttribute('height'));
            const rect = viewport.getBoundingClientRect();
            const padding = 60;
            const scaleX = (rect.width - padding * 2) / svgWidth;
            const scaleY = (rect.height - padding * 2) / svgHeight;
            transform.scale = Math.min(scaleX, scaleY, 1);
            transform.x = (rect.width - svgWidth * transform.scale) / 2;
            transform.y = (rect.height - svgHeight * transform.scale) / 2;
            updateTransform();
            saveState();
            viewport.dispatchEvent(new CustomEvent('dag-zoom-change', { detail: transform }));
        },
        reset: () => {
            transform.x = 0;
            transform.y = 0;
            transform.scale = 1;
            updateTransform();
            saveState();
            viewport.dispatchEvent(new CustomEvent('dag-zoom-change', { detail: transform }));
        }
    };
}

/**
 * Show DAG preview in modal with drag and zoom support
 */
function showDAGPreview() {
    if (!state.dagPositionedNodes || !state.dagLayoutEdges) {
        return;
    }

    // Remove existing overlay
    const existingOverlay = document.querySelector(".dag-preview-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const svg = generateSVG(state.dagPositionedNodes, state.dagLayoutEdges, {}, state.dagNodeStatuses);
    const transform = state.dagViewTransform || { x: 0, y: 0, scale: 1 };
    const viewportHtml = createDAGViewport(svg, transform);

    // Create overlay with toolbar
    const overlay = document.createElement("div");
    overlay.className = "dag-preview-overlay";
    overlay.innerHTML = `
    <div class="dag-preview-modal">
      <div class="dag-preview-toolbar">
        <button class="dag-toolbar-btn" data-action="zoom-in" title="放大">+</button>
        <button class="dag-toolbar-btn" data-action="zoom-out" title="缩小">−</button>
        <button class="dag-toolbar-btn" data-action="fit" title="适应窗口">⊡</button>
        <button class="dag-toolbar-btn" data-action="reset" title="重置">⟲</button>
        <span class="dag-zoom-level">${Math.round(transform.scale * 100)}%</span>
      </div>
      <div class="dag-preview-viewport-wrapper">
        ${viewportHtml}
      </div>
      <button class="dag-preview-close">&times;</button>
    </div>
  `;
    document.body.appendChild(overlay);

    // Initialize viewport interactions
    const viewport = overlay.querySelector(".dag-viewport");
    const viewportAPI = initDAGViewportInteractions(viewport);

    // Auto-fit to window when preview opens
    viewportAPI.fitToWindow();

    // Zoom level display update
    const zoomLevelEl = overlay.querySelector('.dag-zoom-level');
    viewport.addEventListener('dag-zoom-change', (e) => {
        zoomLevelEl.textContent = Math.round(e.detail.scale * 100) + '%';
    });

    // Toolbar button handlers
    overlay.querySelectorAll('.dag-toolbar-btn').forEach(btn => {
        btn.onclick = () => {
            const action = btn.dataset.action;
            switch(action) {
                case 'zoom-in': viewportAPI.zoomIn(); break;
                case 'zoom-out': viewportAPI.zoomOut(); break;
                case 'fit': viewportAPI.fitToWindow(); break;
                case 'reset': viewportAPI.reset(); break;
            }
        };
    });

    // Re-attach node click handlers for preview
    initDAGNodeClick(overlay);

    // Close handler - save state
    const saveAndClose = () => {
        state.dagViewTransform = viewportAPI.getTransform();
        overlay.remove();
    };
    overlay.querySelector(".dag-preview-close").onclick = saveAndClose;
    overlay.onclick = (e) => {
        if (e.target === overlay) saveAndClose();
    };
}

window.showDAGPreview = showDAGPreview;

/**
 * Show Scope preview in modal
 */
function showScopePreview() {
    if (!state.scope) {
        return;
    }

    // Remove existing overlay
    const existingOverlay = document.querySelector(".dag-preview-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const scopeJson = JSON.stringify(state.scope, null, 2);

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "dag-preview-overlay";
    overlay.innerHTML = `
    <div class="dag-preview-modal scope-preview-modal">
      <button class="dag-preview-close">&times;</button>
      <div class="scope-preview-content">
        <pre>${escapeHtml(scopeJson)}</pre>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);

    // Close handler
    overlay.querySelector(".dag-preview-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

window.showScopePreview = showScopePreview;

/**
 * Show Log preview in modal
 */
function showLogPreview(logIndex) {
    const log = state.logs[logIndex];
    if (!log) {
        return;
    }

    // Remove existing overlay
    const existingOverlay = document.querySelector(".dag-preview-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }

    let content = log.content || 'No content available';
    if (typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
    }

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "dag-preview-overlay";
    overlay.innerHTML = `
    <div class="dag-preview-modal scope-preview-modal">
      <button class="dag-preview-close">&times;</button>
      <div class="scope-preview-content">
        <div class="log-preview-header">
          <strong>${escapeHtml(log.name)}</strong>
          <span class="log-preview-time">${formatTime(log.createdAt)}</span>
        </div>
        <pre>${escapeHtml(content)}</pre>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);

    // Close handler
    overlay.querySelector(".dag-preview-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

window.showLogPreview = showLogPreview;

/**
 * Toggle DAG floating container collapse
 */
function toggleDAGCollapse() {
    state.dagCollapsed = !state.dagCollapsed;
    const container = document.getElementById("dag-floating");
    if (container) {
        const body = container.querySelector(".dag-floating-body");
        const btn = container.querySelector(".dag-floating-collapse-btn");
        if (state.dagCollapsed) {
            body.classList.add("collapsed");
            btn.textContent = "▶";
            btn.title = "Expand";
        } else {
            body.classList.remove("collapsed");
            btn.textContent = "▼";
            btn.title = "Collapse";
        }
    }
}

// Make toggleDAGCollapse available globally
window.toggleDAGCollapse = toggleDAGCollapse;

/**
 * Restore DAG from workflow logs (for page refresh or workspace switch)
 * @param {Array} logs - Workflow logs
 */
function restoreDAGFromLogs(logs) {
    // Find plan_generated log
    const planLog = logs.find((log) => log.type === "plan_generated");
    if (!planLog) {
        return;
    }

    const steps = planLog.steps || [];
    const nodes = planLog.nodes || {};

    const hasDAG = Object.keys(nodes).length > 0;
    const isSerial = steps.length > 0 && !hasDAG;

    let positionedNodes, layoutEdges;

    if (hasDAG) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            horizontalGap: 80,
            verticalGap: 20,
        };
        positionedNodes = computeDAGLayout(nodes, layoutOptions);
        layoutEdges = buildEdgesFromNodes(nodes, positionedNodes);
    } else if (isSerial) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            verticalGap: 20,
        };
        const layout = computeSerialLayout(steps, layoutOptions);
        positionedNodes = layout.nodes;
        layoutEdges = layout.edges;
    }

    if (!positionedNodes || Object.keys(positionedNodes).length === 0) {
        return;
    }

    // Store DAG data in state
    state.dagData = { nodes, steps };
    state.dagPositionedNodes = positionedNodes;
    state.dagLayoutEdges = layoutEdges;
    state.dagFloatingVisible = true;

    // Helper function to convert step name to node ID format
    // workflow.json uses "Step 0", "Step 1" but nodes use "step_1", "step_2"
    const convertStepNameToNodeId = (stepName) => {
        if (!stepName) return null;
        // If already in node ID format (step_1, step_2), return as-is
        if (stepName.startsWith("step_")) {
            return stepName;
        }
        // Convert "Step 0" -> "step_1", "Step 1" -> "step_2", etc.
        const match = stepName.match(/^Step\s+(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10) + 1;
            return `step_${num}`;
        }
        return stepName;
    };

    // Determine step statuses from logs
    const nodeStatuses = {};
    const completedSteps = logs.filter((log) => log.type === "step_completed");
    const startedSteps = logs.filter((log) => log.type === "step_started");
    const currentStepLog = logs.find((log) => log.type === "step_started");

    // Mark completed steps (优先使用 step_id)
    completedSteps.forEach((log) => {
        const stepId = log.step_id || log.stepName || log.step_name;
        const nodeId = convertStepNameToNodeId(stepId);
        if (nodeId) {
            nodeStatuses[nodeId] = "completed";
        }
    });

    // Mark current running step (优先使用 step_id)
    const currentStepId = currentStepLog?.step_id || currentStepLog?.stepName || currentStepLog?.step_name;
    const currentNodeId = convertStepNameToNodeId(currentStepId);
    const currentStepCompleted = completedSteps.some((c) => {
        const cStepId = c.step_id || c.stepName || c.step_name;
        return convertStepNameToNodeId(cStepId) === currentNodeId;
    });
    if (currentStepLog && currentNodeId && !currentStepCompleted) {
        nodeStatuses[currentNodeId] = "running";
    }

    state.dagNodeStatuses = nodeStatuses;

    // Floating DAG will be added by renderMessages -> addFloatingDAGContainer
}

/**
 * Update DAG node status and re-render floating container
 * @param {string} stepName - Step ID
 * @param {string} status - Status: "pending" | "running" | "completed"
 */
function updateDAGNodeStatus(stepName, status) {
    if (!state.dagFloatingVisible || !stepName) {
        return;
    }

    // Convert step name to node ID format ("Step 0" -> "step_1")
    const convertStepNameToNodeId = (name) => {
        if (!name) return null;
        if (name.startsWith("step_")) {
            return name;
        }
        const match = name.match(/^Step\s+(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10) + 1;
            return `step_${num}`;
        }
        return name;
    };

    const nodeId = convertStepNameToNodeId(stepName);

    // Update status
    state.dagNodeStatuses[nodeId] = status;

    // Re-render floating DAG
    const container = document.getElementById("dag-floating");
    if (container && state.dagPositionedNodes && state.dagLayoutEdges) {
        const svg = generateSVG(state.dagPositionedNodes, state.dagLayoutEdges, {}, state.dagNodeStatuses);
        const body = container.querySelector(".dag-scroll-area");
        if (body) {
            body.innerHTML = svg;
        }

        // Update header with new count
        const stepCount = Object.keys(state.dagPositionedNodes).length;
        const completedCount = Object.values(state.dagNodeStatuses).filter(s => s === "completed").length;
        const header = container.querySelector(".dag-floating-header span");
        if (header) {
            header.textContent = `📋 Execution Plan (${completedCount}/${stepCount} completed)`;
        }
    }
}

/**
 * Render step list for backward compatibility
 * @param {Array} steps - Steps array
 * @param {Object} nodes - Nodes object
 * @returns {string} - HTML string
 */
function renderStepList(steps, nodes) {
    let html = '<div class="plan-flow">';

    const items =
        Object.keys(nodes).length > 0
            ? Object.entries(nodes).map(([id, node]) => ({ id, ...node }))
            : steps;

    items.forEach((item, index) => {
        const depNames = (item.depends_on || []).join(", ") || "none";
        html += `<div class="plan-step">
      <div class="step-number">${index + 1}</div>
      <div class="step-content">
        <div class="step-header">
          <span class="step-id">${escapeHtml(item.step_id || item.id)}</span>
          ${item.skill ? `<span class="step-skill">🔧 ${escapeHtml(item.skill)}</span>` : ""}
        </div>
        <div class="step-goal">${escapeHtml(item.goal || "")}</div>
        <div class="step-deps">📌 Deps: ${escapeHtml(depNames)}</div>
      </div>
    </div>`;
    });

    html += "</div>";
    return html;
}

/**
 * Render plan visualization
 */
function renderPlanVisualization(log) {
    let html = `<div class="plan-visualization">`;

    // Show scope summary
    if (log.scope && Object.keys(log.scope).length > 0) {
        html += `<div class="plan-section">
      <div class="plan-section-title">📊 Scope</div>
      <pre class="scope-summary">${escapeHtml(JSON.stringify(log.scope, null, 2))}</pre>
    </div>`;
    }

    // Show steps/nodes
    const steps = log.steps || [];
    const nodes = log.nodes || {};

    html += `<div class="plan-section">
    <div class="plan-section-title">📋 Execution Plan (${Math.max(steps.length, Object.keys(nodes).length)} steps)</div>`;

    // Render DAG visualization or fallback to list
    const hasDAG = Object.keys(nodes).length > 0;
    const hasDeps =
        hasDAG &&
        Object.values(nodes).some((n) => (n.depends_on || []).length > 0);
    const isSerial = steps.length > 0 && !hasDAG;

    if (hasDAG && hasDeps) {
        // DAG mode: render as directed acyclic graph
        html += renderDAGVisualization(log);
    } else if (hasDAG || isSerial) {
        // Simple list mode for serial execution or no dependencies
        html += renderStepList(steps, nodes);
    }

    html += `</div></div>`;
    return html;
}

/**
 * Format time
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Update input state
 */
function updateInputState() {
    const input = document.getElementById("message-input");
    const inputArea = document.querySelector(".input-area");
    const btn = document.getElementById("btn-send");

    // Hide input when workflow is running (after COLLECTING stage)
    // Allow input only in IDLE stage or when waiting for user input
    // Note: stage from backend is lowercase (e.g., 'planning')
    const activeStages = ["planning", "executing", "reviewing", "completed"];
    if (
        state.isAnalyzing &&
        !state.awaitingUserInput &&
        activeStages.includes(state.stage)
    ) {
        inputArea.style.display = "none";
        return;
    }

    // Also hide if workflow is completed
    if (state.isWorkflowCompleted) {
        inputArea.style.display = "none";
        return;
    }

    // Show input
    inputArea.style.display = "block";

    // Enable input if: has workspace AND (not analyzing OR waiting for user input)
    const canInput =
        state.selectedWorkspaceId &&
        (!state.isAnalyzing || state.awaitingUserInput);
    input.disabled = !canInput;
    btn.disabled = !canInput;

    if (state.awaitingUserInput) {
        input.placeholder = "Please answer the question above...";
    } else if (state.isAnalyzing) {
        input.placeholder = "Analyzing...";
    } else if (state.selectedWorkspaceId) {
        input.placeholder =
            "Enter blockchain address or transaction hash to analyze...";
    } else {
        input.placeholder = "Please select a workspace first";
    }
}

/**
 * Update connection status
 */
function updateConnectionStatus(status) {
    state.connectionStatus = status;
    const el = document.getElementById("connection-status");
    el.className = `connection-status ${status}`;
    el.querySelector(".status-text").textContent =
        status === "connected" ? "Connected" : "Connecting...";
}

/**
 * Update stage indicator
 */
function updateStageIndicator(stage) {
    state.stage = stage;
    const el = document.getElementById("stage-indicator");
    const stageNames = {
        idle: "Idle",
        collecting: "Collecting",
        planning: "Planning",
        executing: "Executing",
        reviewing: "Reviewing",
        completed: "Completed",
    };
    el.textContent = stageNames[stage] || stage;
    el.className = `stage-indicator ${stage}`;

    // Show progress bar in executing stage, hide in others
    const progressEl = document.getElementById("step-progress");
    if (stage === "executing") {
        progressEl.classList.add("active");
    } else {
        progressEl.classList.remove("active");
    }
}

/**
 * Update step progress
 */
function updateStepProgress(step, totalSteps) {
    state.currentStep = step;
    state.totalSteps = totalSteps;

    const fillEl = document.getElementById("step-progress-fill");
    const textEl = document.getElementById("step-progress-text");

    if (totalSteps > 0) {
        const percent = (step / totalSteps) * 100;
        fillEl.style.width = `${percent}%`;
        textEl.textContent = `Step ${step}/${totalSteps}`;
    } else {
        fillEl.style.width = "0%";
        textEl.textContent = "";
    }
}

/**
 * Render workspace list
 */
function renderWorkspaceList() {
    const container = document.getElementById("workspace-list");

    if (state.workspaces.length === 0) {
        container.innerHTML = '<div class="loading">No workspaces</div>';
        return;
    }

    container.innerHTML = state.workspaces
        .map(
            (ws) => `
    <div class="workspace-item ${ws.id === state.selectedWorkspaceId ? "active" : ""}"
         data-id="${ws.id}">
      <div class="ws-content">
        <div class="title">${ws.name}</div>
        <div class="meta">${formatTime(ws.createdAt)}</div>
      </div>
      ${ws.isCompleted
        ? '<span class="status-badge completed">Completed</span>'
        : '<span class="status-badge running">Running</span>'}
      <button class="btn-delete" data-id="${ws.id}" title="Delete workspace">×</button>
    </div>
  `,
        )
        .join("");

    // Add click event
    container.querySelectorAll(".workspace-item").forEach((item) => {
        item.addEventListener("click", (e) => {
            if (e.target.closest(".btn-delete")) return;
            selectWorkspace(item.dataset.id);
        });
    });

    // Delete button event
    container.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            showDeleteConfirm(btn.dataset.id);
        });
    });
}

/**
 * Select workspace
 */
async function selectWorkspace(workspaceId) {
    // Stop auto-refresh for previous workspace
    stopAutoRefresh();

    state.selectedWorkspaceId = workspaceId;
    state.messages = [];
    state.workflowLogs = []; // Clear workflow logs
    state.isWorkflowCompleted = false; // Reset completion status
    state.scope = null;
    state.charts = [];
    state.reports = [];
    state.logs = [];
    state.isAnalyzing = false;
    state.stage = "idle";

    // Request workflow logs
    websocketService.send({
        type: "GET_WORKFLOW_LOG",
        payload: { workspaceId },
    });

    renderWorkspaceList();
    renderMessages();
    updateInputState();
    renderDetailContent();
    updateWorkflowControls("none");

    showLoading(true);
    // Request workspace details
    websocketService.send({
        type: "GET_WORKSPACE",
        payload: { workspaceId },
    });

    // Start auto-refresh for active workspace
    startAutoRefresh();
}

/**
 * 启动备用刷新定时器
 * 间隔10秒刷新一次，防止 WebSocket 事件丢失
 */
function startAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
    }

    state.autoRefreshInterval = setInterval(() => {
        if (state.selectedWorkspaceId && state.isAnalyzing) {
            // 直接发送请求，不需要节流检查（10秒间隔已足够）
            websocketService.send({
                type: "GET_WORKSPACE",
                payload: { workspaceId: state.selectedWorkspaceId },
            });
            // 更新最后刷新时间，避免和 addMessage 的节流冲突
            state.lastRefreshTime = Date.now();
        }
    }, 10000);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
}

/**
 * Render detail content
 */
function renderDetailContent() {
    const container = document.getElementById("detail-content");

    if (!state.selectedWorkspaceId) {
        container.innerHTML =
            '<div class="empty-detail"><p>Select a workspace to view details</p></div>';
        return;
    }

    const tab = state.activeTab;

    switch (tab) {
        case "scope":
            renderScopeView(container);
            break;
        case "charts":
            renderChartsView(container);
            break;
        case "reports":
            renderReportsView(container);
            break;
        case "logs":
            renderLogsView(container);
            break;
    }
}

/**
 * Render Scope view
 */
function renderScopeView(container) {
    if (!state.scope) {
        container.innerHTML = '<div class="loading">Loading...</div>';
        return;
    }

    // Add search box with preview button
    container.innerHTML = `
    <div class="detail-view">
      <h4>Scope (State Variables) <button class="preview-btn" onclick="showScopePreview()">Preview</button></h4>
      <div class="search-box">
        <input type="text" id="scope-search" placeholder="Search key or value...">
        <button id="scope-search-btn">Search</button>
      </div>
      <div class="scope-tree" id="scope-tree"></div>
    </div>
  `;

    // Render tree structure
    const treeEl = document.getElementById("scope-tree");
    treeEl.innerHTML = renderTree(state.scope);

    // Search functionality
    document
        .getElementById("scope-search-btn")
        .addEventListener("click", () => {
            const keyword = document
                .getElementById("scope-search")
                .value.toLowerCase();
            if (keyword) {
                highlightSearch(treeEl, keyword);
            } else {
                clearHighlight(treeEl);
            }
        });

    document.getElementById("scope-search").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            document.getElementById("scope-search-btn").click();
        }
    });

    // Collapse/expand functionality
    treeEl.querySelectorAll(".tree-toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            toggle.classList.toggle("collapsed");
        });
    });
}

/**
 * Render tree structure
 */
function renderTree(data, depth = 0) {
    if (data === null) {
        return '<span class="tree-null">null</span>';
    }

    if (typeof data !== "object") {
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
        html += "</div>]";
        return html;
    }

    // Object
    const keys = Object.keys(data);
    if (keys.length === 0) return '<span class="tree-string">{}</span>';

    let html = '<span class="tree-toggle collapsed">▼</span>{';
    html += '<div class="tree-children">';
    keys.forEach((key) => {
        html += `<div class="tree-node">`;
        html += `<span class="tree-key">"${key}"</span>: `;
        html += renderTree(data[key], depth + 1);
        html += `</div>`;
    });
    html += "</div>}";
    return html;
}

/**
 * Render value
 */
function renderValue(value) {
    if (typeof value === "string") {
        return `<span class="tree-string">"${escapeHtml(value)}"</span>`;
    }
    if (typeof value === "number") {
        return `<span class="tree-number">${value}</span>`;
    }
    if (typeof value === "boolean") {
        return `<span class="tree-boolean">${value}</span>`;
    }
    if (value === null) {
        return `<span class="tree-null">null</span>`;
    }
    return String(value);
}

/**
 * HTML escape
 */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Highlight search results
 */
function highlightSearch(container, keyword) {
    clearHighlight(container);

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodesToHighlight = [];

    let node;
    while ((node = walker.nextNode())) {
        if (node.textContent.toLowerCase().includes(keyword)) {
            nodesToHighlight.push(node);
        }
    }

    nodesToHighlight.forEach((node) => {
        const regex = new RegExp(`(${escapeRegex(keyword)})`, "gi");
        const span = document.createElement("span");
        span.innerHTML = node.textContent.replace(
            regex,
            '<mark style="background: #fbbf24; color: #000; padding: 0 2px; border-radius: 2px;">$1</mark>',
        );
        node.parentNode.replaceChild(span, node);
    });
}

/**
 * Clear highlight
 */
function clearHighlight(container) {
    const marks = container.querySelectorAll("mark");
    marks.forEach((mark) => {
        const text = document.createTextNode(mark.textContent);
        mark.parentNode.replaceChild(text, mark);
    });
}

/**
 * Escape regular expression
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Render Charts view
 */
function renderChartsView(container) {
    if (state.charts.length === 0) {
        container.innerHTML =
            '<div class="empty-detail"><p>No charts available</p></div>';
        return;
    }

    // Search box
    container.innerHTML = `
    <div class="detail-view">
      <div class="search-box">
        <input type="text" id="chart-search" placeholder="Search charts...">
      </div>
      <div class="chart-list" id="chart-list">
        ${state.charts
            .map(
                (chart, index) => `
          <div class="chart-item" data-index="${index}">
            <button class="fullscreen-btn" title="Fullscreen">⛶</button>
            <div class="name">${chart.name}</div>
            <div class="time">${formatTime(chart.createdAt)}</div>
            ${chart.content ? `<div class="chart-preview">${chart.content}</div>` : ""}
          </div>
        `,
            )
            .join("")}
      </div>
    </div>
  `;

    // Search functionality
    const searchInput = document.getElementById("chart-search");
    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase();
        document.querySelectorAll(".chart-item").forEach((item) => {
            const name = item.querySelector(".name").textContent.toLowerCase();
            item.style.display = name.includes(keyword) ? "block" : "none";
        });
    });

    // Fullscreen view
    container.querySelectorAll(".fullscreen-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const index = btn.closest(".chart-item").dataset.index;
            const chart = state.charts[index];
            showChartFullscreen(chart);
        });
    });

    // Click chart item to view fullscreen
    container.querySelectorAll(".chart-item").forEach((item) => {
        item.addEventListener("click", () => {
            const index = item.dataset.index;
            const chart = state.charts[index];
            showChartFullscreen(chart);
        });
    });
}

/**
 * View chart in fullscreen
 */
function showChartFullscreen(chart) {
    const modal = document.createElement("div");
    modal.className = "chart-preview-modal";
    modal.innerHTML = `
    <button class="close-btn">×</button>
    <div class="chart-full">${chart.content || ""}</div>
  `;
    document.body.appendChild(modal);

    modal
        .querySelector(".close-btn")
        .addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });

    // ESC to close
    const escHandler = (e) => {
        if (e.key === "Escape") {
            modal.remove();
            document.removeEventListener("keydown", escHandler);
        }
    };
    document.addEventListener("keydown", escHandler);
}

/**
 * View report in fullscreen
 */
function showReportFullscreen(content, workspaceId) {
    const modal = document.createElement("div");
    modal.className = "report-preview-modal";
    modal.innerHTML = `
    <button class="close-btn">×</button>
    <div class="report-full">${renderMarkdown(content, workspaceId)}</div>
  `;
    document.body.appendChild(modal);

    modal
        .querySelector(".close-btn")
        .addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });

    // ESC to close
    const escHandler = (e) => {
        if (e.key === "Escape") {
            modal.remove();
            document.removeEventListener("keydown", escHandler);
        }
    };
    document.addEventListener("keydown", escHandler);
}

/**
 * Render Reports view
 */
function renderReportsView(container) {
    if (state.reports.length === 0) {
        container.innerHTML =
            '<div class="empty-detail"><p>No reports available</p></div>';
        return;
    }

    // Search box
    container.innerHTML = `
    <div class="detail-view">
      <div class="search-box">
        <input type="text" id="report-search" placeholder="Search reports...">
      </div>
      <div class="report-list" id="report-list">
        ${state.reports
            .map(
                (report, index) => `
          <div class="report-item" data-index="${index}" data-name="${report.name}">
            <div class="name">${report.name}</div>
            <div class="time">${formatTime(report.createdAt)}</div>
          </div>
        `,
            )
            .join("")}
      </div>
      <div class="report-content" id="report-content" style="display: none;"></div>
    </div>
  `;

    // Search functionality
    const searchInput = document.getElementById("report-search");
    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase();
        document.querySelectorAll(".report-item").forEach((item) => {
            const name = item.dataset.name.toLowerCase();
            item.style.display = name.includes(keyword) ? "block" : "none";
        });
    });

    // Click to view report content - fullscreen preview
    const reportContent = document.getElementById("report-content");
    container.querySelectorAll(".report-item").forEach((item) => {
        item.addEventListener("click", async () => {
            const index = item.dataset.index;
            const report = state.reports[index];
            const workspaceId = state.selectedWorkspaceId;

            // Show report in fullscreen
            if (report.content) {
                showReportFullscreen(report.content, workspaceId);
            } else {
                // Request report content, then show in fullscreen
                websocketService.send({
                    type: "GET_REPORT_CONTENT",
                    payload: { workspaceId, reportName: report.name },
                });
                // Temporarily save workspaceId for later use
                state.pendingReportWorkspaceId = workspaceId;
            }

            // Record currently viewed report
            state.currentReportIndex = index;
        });
    });
}

/**
 * Render report content
 */
function renderReportContent(container, content) {
    container.innerHTML = `<div class="report-content">${renderMarkdown(content)}</div>`;
}

/**
 * Render Logs view
 */
function renderLogsView(container) {
    if (state.logs.length === 0) {
        container.innerHTML =
            '<div class="empty-detail"><p>No logs available</p></div>';
        return;
    }

    // Filter and search
    container.innerHTML = `
    <div class="detail-view">
      <div class="filter-bar">
        <select id="log-level-filter">
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </div>
      <div class="search-box">
        <input type="text" id="log-search" placeholder="Search log content...">
      </div>
      <div class="log-list" id="log-list">
        ${state.logs
            .map(
                (log, index) => `
          <div class="log-item" data-index="${index}" data-name="${log.name}">
            <div class="name">${log.name}</div>
            <div class="time">${formatTime(log.createdAt)}</div>
          </div>
        `,
            )
            .join("")}
      </div>
      <div class="log-content" id="log-content" style="display: none;"></div>
    </div>
  `;

    // Filter by level
    document
        .getElementById("log-level-filter")
        .addEventListener("change", (e) => {
            state.logFilter = e.target.value;
            applyLogFilter();
        });

    // Search
    const searchInput = document.getElementById("log-search");
    searchInput.addEventListener("input", () => {
        applyLogFilter();
    });

    // Click to view log content in preview modal
    container.querySelectorAll(".log-item").forEach((item) => {
        item.addEventListener("click", () => {
            const index = item.dataset.index;
            showLogPreview(index);
        });
    });
}

/**
 * Apply log filter
 */
function applyLogFilter() {
    const level =
        document.getElementById("log-level-filter")?.value || state.logFilter;
    const keyword =
        document.getElementById("log-search")?.value.toLowerCase() || "";

    document.querySelectorAll(".log-item").forEach((item) => {
        const name = item.dataset.name.toLowerCase();
        const matchesKeyword = !keyword || name.includes(keyword);
        item.style.display = matchesKeyword ? "block" : "none";
    });
}

/**
 * Render log content
 */
function renderLogContent(container, content) {
    const lines = content.split("\n");
    const html = lines
        .map((line) => {
            let className = "log-line";
            let time = "";

            // Parse log line
            const timeMatch = line.match(
                /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/,
            );
            if (timeMatch) {
                time = timeMatch[1];
            }

            // Level detection
            if (
                line.toLowerCase().includes("error") ||
                line.toLowerCase().includes("err]")
            ) {
                className += " error";
            } else if (
                line.toLowerCase().includes("warn") ||
                line.toLowerCase().includes("warning")
            ) {
                className += " warn";
            } else if (line.toLowerCase().includes("debug")) {
                className += " debug";
            } else {
                className += " info";
            }

            return `<div class="${className}">
      ${time ? `<span class="log-time">${time}</span>` : ""}
      <span class="log-text">${escapeHtml(line)}</span>
    </div>`;
        })
        .join("");

    container.innerHTML = html;

    // Apply filter
    applyLogFilter();
}

/**
 * Highlight JSON
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
 * Initialize WebSocket events
 */
function initWebSocketEvents() {
    // Workspace event handling
    const handleWorkspaceData = (data) => {
        // Backend data is in payload
        const payload = data.payload || data;
        const { workspaceId, scope, charts, reports, logs, workflowStatus } = payload;
        if (workspaceId === state.selectedWorkspaceId) {
            state.scope = scope;
            state.charts = charts || [];
            state.reports = reports || [];
            state.logs = logs || [];

            // 恢复工作流状态（刷新页面后）
            if (workflowStatus) {
                state.isAnalyzing = workflowStatus.isRunning || false;
                state.stage = workflowStatus.stage || 'idle';
                state.awaitingUserInput = workflowStatus.awaitingUserInput || false;
                state.isWorkflowCompleted = !workflowStatus.isRunning && state.stage === 'completed';

                // 更新阶段指示器
                updateStageIndicator(state.stage);

                // 更新工作流控制按钮
                if (state.isAnalyzing && !state.awaitingUserInput &&
                    (state.stage === 'executing' || state.stage === 'planning' || state.stage === 'collecting')) {
                    updateWorkflowControls("running");
                }
            }

            // 更新输入框状态（根据恢复的状态隐藏/显示）
            updateInputState();

            renderDetailContent();
        }
    };

    websocketService.on("connected", () => {
        updateConnectionStatus("connected");
        // Request workspace list
        websocketService.send({ type: "GET_WORKSPACES" });
    });

    websocketService.on("disconnected", () => {
        updateConnectionStatus("disconnected");
    });

    websocketService.on("error", (data) => {
        console.error("WebSocket error:", data);
    });

    // Workspace created - record new workspace and request list refresh
    websocketService.on("WORKSPACE_CREATED", (data) => {
        const payload = data.payload || data;
        const { workspaceId, title } = payload;

        // Save new workspace info for later selection
        state.pendingWorkspace = {
            id: workspaceId,
            name: title || workspaceId,
            createdAt: new Date().toISOString(),
            charts: 0,
            reports: 0,
            logs: 0,
        };

        // Request latest list
        websocketService.send({ type: "GET_WORKSPACES" });
    });

    // Workspace list - sync with backend and handle pending workspace
    websocketService.on("WORKSPACES_LIST", (data) => {
        const payload = data.payload || data;
        const newWorkspaces = (payload.workspaces || []).map((ws) => ({
            id: ws.workspaceId || ws.id,
            name: ws.title || ws.workspaceId || ws.id,
            createdAt: ws.createdAt,
            charts: ws.hasCharts ? 1 : 0,
            reports: ws.hasReports ? 1 : 0,
            logs: ws.hasLogs ? 1 : 0,
            isCompleted: ws.isCompleted || false,
        }));

        // Keep currently selected workspace (if not in new list)
        const selectedId = state.selectedWorkspaceId;
        const existingSelected = newWorkspaces.find(
            (ws) => ws.id === selectedId,
        );

        if (selectedId && !existingSelected) {
            const localSelected = state.workspaces.find(
                (ws) => ws.id === selectedId,
            );
            if (localSelected) {
                newWorkspaces.unshift(localSelected);
            }
        }

        state.workspaces = newWorkspaces;
        renderWorkspaceList();

        // Check if there is a pending workspace (set in WORKSPACE_CREATED)
        if (state.pendingWorkspace) {
            const exists = state.workspaces.some(
                (ws) => ws.id === state.pendingWorkspace.id,
            );
            if (exists) {
                const ws = state.pendingWorkspace;
                state.pendingWorkspace = null;
                selectWorkspace(ws.id);
            }
        }
    });

    // Workspace deleted
    websocketService.on("WORKSPACE_DELETED", (data) => {
        const payload = data.payload || data;
        const { workspaceId } = payload;
        state.workspaces = state.workspaces.filter(
            (ws) => ws.id !== workspaceId,
        );
        renderWorkspaceList();
    });

    // Workspace details
    websocketService.on("WORKSPACE_DETAILS", (data) => {
        showLoading(false);
        handleWorkspaceData(data);
    });

    // Agent message
    websocketService.on("AGENT_MESSAGE", (data) => {
        const payload = data.payload || data;
        const { agent, message, stage, step, totalSteps, requiresInput } =
            payload;

        showLoading(false);

        // If agent needs user input, enable input
        if (requiresInput) {
            state.isAnalyzing = false;
            state.awaitingUserInput = true;
            updateInputState();
        }

        if (stage) {
            state.stage = stage;
            updateStageIndicator(stage);
            // Set isAnalyzing during active stages
            if (
                stage === "executing" ||
                stage === "planning" ||
                stage === "collecting"
            ) {
                state.isAnalyzing = true;
                updateWorkflowControls("running");
            }
            updateInputState();
        }

        if (typeof step === "number" && typeof totalSteps === "number") {
            updateStepProgress(step, totalSteps);
        }

        addMessage({
            type: "agent",
            agentType: agent || "Agent",
            content: message,
            timestamp: new Date().toISOString(),
        });

        // Analysis completed
        if (stage === "completed") {
            state.isAnalyzing = false;
            state.awaitingUserInput = false;
            state.isWorkflowCompleted = true;
            updateInputState();
            updateWorkflowControls("none");
        }
    });

    // Step started event
    websocketService.on("STEP_STARTED", (data) => {
        const payload = data.payload || data;
        const { stepIndex, step } = payload;
        const totalSteps =
            state.totalSteps ||
            (step && (step.totalSteps || (step.steps && step.steps.length)));
        updateStepProgress(stepIndex + 1, totalSteps || 0);
    });

    // Plan completed event - get total steps
    websocketService.on("PLANNING_COMPLETED", (data) => {
        const payload = data.payload || data;
        const { plan } = payload;
        if (plan) {
            // plan.steps is array (serial mode), plan.dag is object (parallel mode)
            const totalSteps =
                (plan.steps && plan.steps.length) ||
                (plan.dag && Object.keys(plan.dag).length) ||
                0;
            state.totalSteps = totalSteps;
        }
    });

    // Stage change
    websocketService.on("STAGE_CHANGED", (data) => {
        const payload = data.payload || data;
        updateStageIndicator(payload.stage);
        updateInputState();
    });

    // Workflow paused
    websocketService.on("WORKFLOW_PAUSED", (data) => {
        const payload = data.payload || data;
        addMessage({
            type: "system",
            content: "Workflow paused",
            timestamp: new Date().toISOString(),
        });
        updateWorkflowControls("paused");
    });

    // Workflow resumed
    websocketService.on("WORKFLOW_RESUMED", (data) => {
        const payload = data.payload || data;
        addMessage({
            type: "system",
            content: "Workflow resumed",
            timestamp: new Date().toISOString(),
        });
        updateWorkflowControls("running");
    });

    // Workflow stopped
    websocketService.on("WORKFLOW_STOPPED", (data) => {
        const payload = data.payload || data;
        addMessage({
            type: "system",
            content: "Workflow stopped",
            timestamp: new Date().toISOString(),
        });
        updateWorkflowControls("none");
        state.isAnalyzing = false;
        updateInputState();
    });

    // Analysis completed
    websocketService.on("ANALYSIS_COMPLETED", (data) => {
        state.isAnalyzing = false;
        state.isWorkflowCompleted = true;
        updateInputState();
        // Refresh workspace details
        if (state.selectedWorkspaceId) {
            websocketService.send({
                type: "GET_WORKSPACE",
                payload: { workspaceId: state.selectedWorkspaceId },
            });
        }
    });

    // Report content
    websocketService.on("REPORT_CONTENT", (data) => {
        const payload = data.payload || data;
        const { reportName, content, workspaceId } = payload;

        // Show report in fullscreen
        const wsId =
            workspaceId ||
            state.pendingReportWorkspaceId ||
            state.selectedWorkspaceId;
        showReportFullscreen(content, wsId);
        delete state.pendingReportWorkspaceId;
    });

    // Log content
    websocketService.on("LOG_CONTENT", (data) => {
        const payload = data.payload || data;
        const { logName, content } = payload;

        const logContent = document.getElementById("log-content");
        if (logContent && logContent.style.display !== "none") {
            renderLogContent(logContent, content);
        }
    });

    // Error
    websocketService.on("ERROR", (data) => {
        const payload = data.payload || data;
        console.error("Analysis error:", payload.error);
        state.isAnalyzing = false;
        updateInputState();
        addMessage({
            type: "system",
            content: `Error: ${payload.error}`,
            timestamp: new Date().toISOString(),
        });
    });

    // Workflow log update
    websocketService.on("WORKFLOW_LOG_UPDATED", (data) => {
        const payload = data.payload || data;
        const { workspaceId } = payload;

        if (workspaceId === state.selectedWorkspaceId) {
            // Request latest workflow logs
            websocketService.send({
                type: "GET_WORKFLOW_LOG",
                payload: { workspaceId },
            });
        }
    });

    // Workflow log content
    websocketService.on("WORKFLOW_LOG_CONTENT", (data) => {
        const payload = data.payload || data;
        const { workspaceId, logs } = payload;

        if (workspaceId === state.selectedWorkspaceId) {
            state.workflowLogs = logs || [];

            // Check if there are workflow_completed type logs
            const hasCompleted = (logs || []).some(
                (log) => log.type === "workflow_completed",
            );
            state.isWorkflowCompleted = hasCompleted;

            // Restore DAG floating container if plan exists
            restoreDAGFromLogs(logs || []);

            renderMessages(); // Refresh message area to display logs
            updateInputState(); // Update input state (may need to hide)
        }
    });

    // File change
    websocketService.on("FILE_CHANGED", (data) => {
        const { workspaceId } = data;
        if (workspaceId === state.selectedWorkspaceId) {
            // Refresh workspace details
            websocketService.send({
                type: "GET_WORKSPACE",
                payload: { workspaceId },
            });
        }
    });

    // Directory change (new charts/reports/logs folders)
    websocketService.on("DIR_CHANGED", (data) => {
        const { workspaceId } = data;
        if (workspaceId === state.selectedWorkspaceId) {
            // Refresh workspace details when new directories are created
            websocketService.send({
                type: "GET_WORKSPACE",
                payload: { workspaceId },
            });
        }
    });

    // Workflow log updated - refresh when logs change
    websocketService.on("WORKFLOW_LOG_UPDATED", (data) => {
        const { workspaceId } = data;
        if (workspaceId === state.selectedWorkspaceId) {
            // Refresh to get latest status
            websocketService.send({
                type: "GET_WORKSPACE",
                payload: { workspaceId },
            });
        }
    });
}

/**
 * Initialize application
 */
export function initApp() {
    createLayout();
    initEventListeners();
    initWebSocketEvents();

    // Connect WebSocket
    websocketService.connect();
}

// Start application
initApp();
