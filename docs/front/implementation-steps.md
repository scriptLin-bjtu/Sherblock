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
- 入口文件: `src/server/index.js`
- 启动命令: `npm run server`

> **注意**：需要先在 `package.json` 中添加 server 脚本：
> ```json
> "scripts": {
>   "server": "node src/server/index.js"
> }
> ```

## 阶段二：前端基础架构 ✅ 已完成（1-2周）

1. **初始化前端项目** ✅
   ```bash
   cd frontend
   npm init -y
   npm install -D vite
   npm install marked
   ```

2. **配置Vite** ✅
   - `frontend/vite.config.js` - 服务器端口5173，代理配置
   - `frontend/index.html` - 入口HTML

3. **实现WebSocket服务** ✅
   - `frontend/src/services/websocket.js`
   - 连接管理、消息收发、重连逻辑

4. **创建基础布局** ✅
   - `frontend/src/main.js` - 应用入口
   - `frontend/src/app.js` - 主应用逻辑
   - 三栏布局（左工作区列表、中对话、右详情）

5. **实现样式** ✅
   - Claude风格的UI设计（深色主题）
   - 响应式布局

### 实现细节
- 前端开发服务器端口: 5173
- 入口文件: `frontend/src/main.js`
- 启动命令: `cd frontend && npm run dev`

## 阶段三：左侧工作区列表 ✅ 已完成（3-5天）

1. **WorkspaceList组件** ✅
   - 显示所有工作区
   - 选中状态高亮
   - 创建新工作区按钮

2. **WorkspaceItem组件** ✅
   - 工作区标题
   - 创建时间
   - 图标标识（charts、reports、logs）

3. **删除功能** ✅
   - 删除确认对话框（模态框）
   - 删除后刷新列表

### 实现细节
- 文件: `frontend/src/app.js`
- 删除按钮: 悬停时显示，点击弹出确认对话框
- 确认对话框: 包含工作区名称提示，确认后发送 `workspace:delete` 事件
- WebSocket事件: 监听 `workspace:deleted` 事件刷新列表

## 阶段四：中间对话区域 ✅ 已完成（5-7天）

1. **ChatContainer组件** ✅
   - 消息列表
   - 输入框
   - 发送按钮

2. **MessageList组件** ✅
   - 消息展示
   - 不同类型消息的样式（agent/user/system）
   - Markdown渲染支持
   - 滚动到底部

3. **MessageItem组件** ✅
   - Agent消息（QuestionAgent、PlanAgent、ExecuteAgent）
   - 用户消息
   - 系统消息

4. **InputBox组件** ✅
   - 多行输入
   - 发送快捷键（Enter/Ctrl+Enter，Shift+Enter换行）
   - 禁用状态（分析中）
   - 状态提示

5. **状态指示器** ✅
   - 阶段指示（IDLE、COLLECTING、PLANNING、EXECUTING、REVIEWING、COMPLETED）
   - 步骤进度条（EXECUTING阶段显示）

### 实现细节
- 文件: `frontend/src/app.js`
- WebSocket事件:
  - `AGENT_MESSAGE` - Agent消息
  - `STEP_STARTED` - 步骤开始（更新进度条）
  - `PLANNING_COMPLETED` - 计划完成（获取总步骤数）
  - `ANALYSIS_COMPLETED` - 分析完成
- 快捷键: Enter 发送，Ctrl+Enter 发送，Shift+Enter 换行

## 阶段五：右侧工作区详情 ✅ 已完成（5-7天）

1. **WorkspaceDetails组件** ✅
   - Tab切换（Scope、Charts、Reports、Logs）
   - 内容展示

2. **ScopeViewer组件** ✅
   - JSON格式化显示
   - 可折叠树状结构（点击 ▶/▼ 展开/折叠）
   - 搜索功能（高亮匹配项）

3. **ChartViewer组件** ✅
   - SVG图表展示
   - 图表列表选择
   - 全屏查看（点击图表或全屏按钮）
   - 搜索过滤

4. **ReportViewer组件** ✅
   - Markdown渲染（代码高亮、表格、链接等）
   - 报告列表选择
   - 搜索过滤

5. **LogViewer组件** ✅
   - 日志内容展示（按级别着色：error/warn/info/debug）
   - 级别筛选（Error/Warn/Info/Debug）
   - 关键字搜索
   - 点击查看详情

### 实现细节
- 文件: `frontend/src/app.js`
- 后端API: `src/server/message-handler.js`
  - `GET_REPORT_CONTENT` - 获取报告文件内容
  - `GET_LOG_CONTENT` - 获取日志文件内容
- 图表全屏: 支持 ESC 键关闭
- 日志级别: 颜色标识 error(红)/warn(黄)/info(蓝)/debug(灰)

## 阶段六：集成测试与优化 ✅ 已完成（3-5天）

1. **端到端测试** ✅
   - 完整工作流测试
   - 多工作区切换测试
   - 错误处理测试

2. **性能优化** ✅
   - WebSocket消息批量处理
   - 前端渲染优化（虚拟滚动）
   - 图片懒加载

3. **用户体验优化** ✅
   - 加载状态指示
   - 错误提示
   - 快捷键支持

4. **部署准备** ✅
   - 环境变量配置
   - 生产环境构建
   - 文档更新

### 实现细节

1. **工作流控制**
   - 暂停/恢复/停止按钮（位于头部导航栏）
   - ESC键停止当前分析
   - 状态反馈消息

2. **API密钥配置**
   - 设置按钮（⚙图标）打开配置对话框
   - 支持GLM、DeepSeek、Etherscan API密钥
   - 密钥保存在localStorage（前端）和环境变量（后端）
   - 快捷键 Ctrl+, 打开设置

3. **加载状态指示**
   - 顶部加载动画（spinner）
   - 创建/选择工作区时显示
   - 获取数据时显示

4. **快捷键支持**
   - Enter / Ctrl+Enter: 发送消息
   - Shift+Enter: 换行
   - ESC: 停止分析
   - Ctrl+,: 打开设置
   - Ctrl+N: 新建工作区

5. **错误处理**
   - WebSocket断开重连
   - API错误提示
   - 工作区不存在提示

### 测试步骤

启动后端服务器和前端开发服务器进行测试：

```bash
# 终端1: 启动后端
npm run server

# 终端2: 启动前端
cd frontend && npm run dev
```

打开浏览器访问 http://localhost:5173

**测试用例：**
1. 配置API密钥 → 点击⚙按钮 → 输入密钥 → 保存
2. 创建工作区 → 输入分析任务 → 观察消息流转
3. 暂停/恢复/停止 → 观察状态变化和按钮显示
4. 多工作区切换 → 验证数据隔离
5. 快捷键测试 → Enter发送、ESC停止、Ctrl+,打开设置
