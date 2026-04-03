/**
 * Server - WebSocket服务器核心模块
 * 启动HTTP和WebSocket服务
 */
import HttpServer from './http-server.js';
import WebSocketServer from './websocket-server.js';
import WorkspaceWatcher from './workspace-watcher.js';

export class Server {
    constructor(options = {}) {
        this.httpPort = options.httpPort || 3000;
        this.wsPort = options.wsPort || 8080;

        this.httpServer = new HttpServer({ port: this.httpPort });
        this.wsServer = null;
        this.workspaceWatcher = null;
    }

    /**
     * 启动服务器
     */
    async start() {
        console.log('[Server] Starting server...');

        // 启动HTTP服务器
        await this.httpServer.start();

        // 启动独立的WebSocket服务器
        this.wsServer = new WebSocketServer({ port: this.wsPort });
        await this.wsServer.start();

        // 启动文件监听器（需要传入messageHandler以获取工作区列表）
        this.workspaceWatcher = new WorkspaceWatcher(this.wsServer, this.wsServer.messageHandler);
        this.workspaceWatcher.start();

        console.log('[Server] Server started successfully');
        console.log(`[Server] HTTP: http://localhost:${this.httpPort}`);
        console.log(`[Server] WebSocket: ws://localhost:${this.wsPort}/ws`);
    }

    /**
     * 停止服务器
     */
    async stop() {
        console.log('[Server] Stopping server...');

        // 停止文件监听器
        if (this.workspaceWatcher) {
            this.workspaceWatcher.stop();
        }

        // 停止WebSocket服务器
        if (this.wsServer) {
            await this.wsServer.stop();
        }

        // 停止HTTP服务器
        await this.httpServer.stop();

        console.log('[Server] Server stopped');
    }

    /**
     * 获取HTTP服务器实例
     */
    getHttpServer() {
        return this.httpServer;
    }

    /**
     * 获取WebSocket服务器实例
     */
    getWsServer() {
        return this.wsServer;
    }

    /**
     * 获取文件监听器实例
     */
    getWorkspaceWatcher() {
        return this.workspaceWatcher;
    }
}

export default Server;