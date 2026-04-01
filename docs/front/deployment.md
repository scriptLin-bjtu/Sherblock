# 部署方案

## 开发环境

```bash
# 终端1: 启动WebSocket服务器
cd D:\project\nodejs-project\sherblock
node src/server/index.js

# 终端2: 启动前端开发服务器
cd D:\project\nodejs-project\sherblock\frontend
npm run dev
```

访问 `http://localhost:5173` 进行开发。

## 生产环境

### 1. 构建前端
```bash
cd frontend
npm run build
```

### `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
'  }
});
```

### `frontend/package.json`
```json
{
  "name": "sherblock-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "marked": "^9.1.6"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### `frontend/index.html`
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sherblock - 区块链交易行为分析Agent</title>
  <link rel="stylesheet" href="/src/styles/base.css">
  <link rel="stylesheet" href="/src/styles/layout.css">
  <link rel="stylesheet" href="/src/styles/components.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### 2. 启动服务器
```bash
node src/server/index.js
```

### `src/server/index.js`
```javascript
import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createHttpServer } from './http-server.js';
import { createWebSocketServer } from './websocket-server.js';

// 创建HTTP服务器
const app = createHttpServer();
const httpServer = http.createServer(app);

// 创建WebSocket服务器
const wsServer = createWebSocketServer(httpServer);

// 启动服务器
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
```

### `src/server/http-server.js`
```javascript
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

### 3. 访问
- `http://localhost:3000` - 生产环境

## Docker部署（可选）

### `Dockerfile`
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制后端代码
COPY package*.json ./
RUN npm install --production
COPY src ./src

# 构建前端
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

EXPOSE 3000

CMD ["node", "src/server/index.js"]
```

### 构建和运行
```bash
# 构建镜像
docker build -t sherblock .

# 运行容器
docker run -p 3000:3000 -v $(pwd)/data:/app/data sherblock
```

## Nginx反向代理（生产环境推荐）

### `nginx.conf`
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/sherblock/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy' cache_bypass $http_upgrade;
    }

    # 工作区文件API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 环境变量

### `.env` 配置
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# API密钥（前端可通过localStorage设置）
GLM_API_KEY=your_glm_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# WebSocket配置
WS_PORT=3000

# 代理配置（如果需要）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

## 监控和日志

### PM2 部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start src/server/index.js --name sherblock

# 查看日志
pm2 logs sherblock

# 重启应用
pm2 restart sherblock
```

### PM2 配置文件 `ecosystem.config.js`
```javascript
module.exports = {
  apps: [{
    name: 'sherblock',
    script: './src/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

## 安全考虑

1. **API密钥保护**
   - 不要在前端硬编码API密钥
   - 使用环境变量或安全配置服务
   - 前端通过localStorage存储用户输入的密钥

2. **WebSocket认证**
   - 实现WebSocket连接认证
   - 使用JWT token验证

3. **CORS配置**
   - 限制允许的域名
   - 配置CORS策略

4. **输入验证**
   - 验证所有用户输入
   - 防止XSS攻击

5. **文件访问控制**
   - 限制可访问的文件路径
   - 防止路径遍历攻击
