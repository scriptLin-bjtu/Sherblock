/**
 * Server Entry Point - WebSocket服务器入口
 * 启动HTTP和WebSocket服务，支持前端Web界面
 */
import Server from './server/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
let httpPort = 3000;
let wsPort = 8080;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--http-port' && args[i + 1]) {
        httpPort = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--ws-port' && args[i + 1]) {
        wsPort = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--help') {
        console.log(`
Usage: node server-index.js [options]

Options:
  --http-port <port>  HTTP server port (default: 3000)
  --ws-port <port>    WebSocket server port (default: 8080)
  --help              Show this help message

Example:
  node server-index.js --http-port 3000 --ws-port 8080
`);
        process.exit(0);
    }
}

// 创建并启动服务器
const server = new Server({
    httpPort,
    wsPort
});

// 处理进程信号
process.on('SIGINT', async () => {
    console.log('\n[Server] Received SIGINT, shutting down...');
    await server.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[Server] Received SIGTERM, shutting down...');
    await server.stop();
    process.exit(0);
});

// 启动服务器
server.start().catch(error => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
});

export default server;