# 关键技术难点与解决方案

## 1. Agent输出重定向

**问题**：当前Agent使用 `console.log` 输出，需要改为WebSocket消息。

**解决方案**：
1. 创建 `ConsoleAdapter` 类，重写 `console.log`
2. 将 `console.log` 输出转换为 WebSocket 消息
3. 在 Orchestrator 初始化时注入

```javascript
// src/adapters/console-adapter.js
export class ConsoleAdapter {
  constructor(ws, workspaceId) {
    this.ws = ws;
    this.workspaceId = workspaceId;
    this.originalConsole = { ...console };
  }

  install() {
    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.send('LOG', { message: args.join(' ') });
    };
  }

  uninstall() {
    console.log = this.originalConsole.log;
  }

  send(type, payload) {
    this.ws.send(JSON.stringify({
      id: Date.now().toString(),
      type,
      timestamp: Date.now(),
      payload,
      workspaceId: this.workspaceId
    }));
  }
}
```

## 2. 多工作区并发管理

**方案**：
1. 使用 `Map<workspaceId, OrchestratorAdapter>` 管理多个活跃工作流
2. 每个工作流独立运行，互不干扰
3. WebSocket消息携带 `workspaceId` 路由到对应适配器

```javascript
// src/server/message-handler.js
class MessageHandler {
  constructor() {
    this.activeWorkflows = new Map(); // 新增
  }

  async handleStartAnalysis(message, ws) {
    const { workspaceId, input } = message.payload;

    // 如果该工作区已有运行中的工作流，先停止
    if (this.activeWorkflows.has(workspaceId)) {
      await this.activeWorkflows.get(workspaceId).stop();
    }

    // 创建新的适配器
    const adapter = new OrchestratorAdapter(ws, workspaceId);
    this.activeWorkflows.set(workspaceId, adapter);

    // 异步运行
    adapter.run(input).finally(() => {
      this.activeWorkflows.delete(workspaceId);
    });
  }
}
```

## 3. 实时文件变化监听

**问题**：多个工作区同时运行时，文件频繁变化会导致大量消息。

**解决方案**：
1. 使用防抖技术，合并短时间内的变化
2. 只监听当前选中工作区的文件
3. 按文件类型分别监听

```javascript
// src/server/workspace-watcher.js
import { watch } from 'chokidar';
import { debounce } from 'lodash';

export class WorkspaceWatcher {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
    this.watcher = null;
    this.debounceNotify = debounce(this.notifyFileChange, 500);
  }

  start() {
    this.watcher = watch('data/**/*.json', {
      ignored: /(^|[\/\\])\../
    });

    this.watcher.on('change', path => {
      this.debounceNotify('change', path);
    });
  }

  notifyFileChange(event, path) {
    // 解析路径获取workspaceId和文件类型
    const { workspaceId, fileType } = this.parsePath(path);
    this.messageHandler.broadcast('FILE_CHANGED', {
      workspaceId,
      eventType: event,
      fileType
    });
  }
}
```

## 4. 大文件传输优化

**问题**：SVG图表和Markdown报告可能很大，直接通过WebSocket传输会影响性能。

**解决方案**：
1. 使用HTTP服务提供文件下载
2. WebSocket只发送文件URL
3. 前端按需加载

```javascript
// src/server/http-server.js
import express from 'express';
import { join } from 'path';

export function createHttpServer() {
  const app = express();

  // 静态文件服务
  app.use(express.static(join(process.cwd(), 'frontend/dist')));

  // 工作区文件API
  app.get('/api/workspaces/:workspaceId/files/:type/:filename', (req, res) => {
    const { workspaceId, type, filename } = req.params;
    const filePath = join(process.cwd(), 'data', workspaceId, type, filename);
    res.sendFile(filePath);
  });

  return app;
}
```

## 5. 状态同步问题

**问题**：WebSocket断开重连后，如何同步当前状态？

**解决方案**：
1. 重连后自动发送 `INIT` 消息
2. 服务器返回当前所有工作区列表
3. 前端根据本地状态判断需要同步哪些工作区

```javascript
// frontend/src/services/websocket.js
connect() {
  this.ws.onopen = () => {
    this.reconnectAttempts = 0;
    this.send('INIT', this.getInitialState());
  };

  this.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'INIT_RESPONSE') {
      // 同步工作区列表
      this.syncWorkspaces(message.payload.workspaces);
    }
  };
}
```

## 6. 错误处理与重试机制

**方案**：
1. Agent执行错误通过WebSocket传递
2. 前端显示错误详情，提供重试选项
3. 步骤级重试：可以重试单个失败步骤

```javascript
// src/adapters/orchestrator-adapter.js
setupEventListeners() {
  this.orchestrator.on('workflow:error', (data) => {
    this.send('ERROR', {
      workspaceId: this.workspaceId,
      error: data.error,
      stepIndex: data.stepIndex,
      canRetry: true
    });
  });
}

// 前端处理错误
handleRetry() {
  this.ws.send('RETRY_STEP', {
    workspaceId: this.workspaceId,
    stepIndex: this.currentError.stepIndex
  });
}
```
