# 实现步骤

## 阶段一：后端WebSocket服务器 ✅ 已完成（1-2周）

1. **安装依赖** ✅
   ```bash
   npm install ws express chokidar uuid
   ```

2. **创建WebSocket服务器** ✅
   - `src/server/index.js` - 服务器入口
   - `src/server/websocket-server.js` - WebSocket实现
   - `src/server/message-handler.js` - 消息处理器
   - `src/server/http-server.js` - HTTP静态文件服务

3. **实现工作区管理API** ✅
   - 列出工作区
   - 获取工作区详情
   - 创建/删除工作区
   - 读取scope、charts、reports、logs

4. **实现Agent适配器** ✅
   - `src/adapters/orchestrator-adapter.js`
   - 将Agent事件转换为WebSocket消息

5. **实现文件监听** ✅
   - `src/server/workspace-watcher.js`
   - 监听data目录变化并广播

6. **测试** ✅
   - 使用WebSocket客户端测试服务器
   - 验证所有消息类型

### 实现细节
- HTTP服务器端口: 3000
- WebSocket服务器端口: 8080
- 入口文件: `src/server-index.js`
- 启动命令: `npm run server`

## 阶段二：前端基础架构（1-2周）

1. **初始化前端项目**
   ```bash
   cd frontend
   npm init -y
   npm install -D vite
   npm install marked
   ```

2. **配置Vite**
   ```javascript
   // frontend/vite.config.js
   export default {
     server: {
       port: 5173
     }
   };
   ```

3. **实现WebSocket服务**
   - `frontend/src/services/websocket.js`
   - 连接管理、消息收发、重连逻辑

4. **创建基础布局**
   - `frontend/src/app.js` - 主应用逻辑
   - 三栏布局（左中右）

5. **实现样式**
   - Claude风格的UI设计
   - 响应式布局

## 阶段三：左侧工作区列表（3-5天）

1. **WorkspaceList组件**
   - 显示所有工作区
   - 选中状态高亮
   - 创建新工作区按钮

2. **WorkspaceItem组件**
   - 工作区标题
   - 创建时间
   - 图标标识（charts、reports、logs）

3. **删除功能**
   - 删除确认对话框
   - 删除后刷新列表

## 阶段四：中间对话区域（5-7天）

1. **ChatContainer组件**
   - 消息列表
   - 输入框
   - 发送按钮

2. **MessageList组件**
   - 消息展示
   - 不同类型消息的样式
   - 滚动到底部

3. **MessageItem组件**
   - Agent消息（QuestionAgent、PlanAgent、ExecuteAgent）
   - 用户消息
   - 系统消息

4. **InputBox组件**
   - 多行输入
   - 发送快捷键（Enter/Ctrl+Enter）
   - 禁用状态（分析中）

5. **状态指示器**
   - 阶段指示（COLLECTING、PLANNING、EXECUTING等）
   - 步骤进度条

## 阶段五：右侧工作区详情（5-7天）

1. **WorkspaceDetails组件**
   - Tab切换（Scope、Charts、Reports、Logs）
   - 内容展示

2. **ScopeViewer组件**
   - JSON格式化显示
   - 可折叠树状结构
   - 搜索功能

3. **ChartViewer组件**
   - SVG图表展示
   - 图表列表选择
   - 全屏查看

4. **ReportViewer组件**
   - Markdown渲染
   - 代码高亮
   - 报告列表选择

5. **LogViewer组件**
   - 日志内容展示
   - 按时间筛选
   - 关键字搜索

## 阶段六：集成测试与优化（3-5天）

1. **端到端测试**
   - 完整工作流测试
   - 多工作区切换测试
   - 错误处理测试

2. **性能优化**
   - WebSocket消息批量处理
   - 前端渲染优化（虚拟滚动）
   - 图片懒加载

3. **用户体验优化**
   - 加载状态指示
   - 错误提示
   - 快捷键支持

4. **部署准备**
   - 环境变量配置
   - 生产环境构建
   - 文档更新
