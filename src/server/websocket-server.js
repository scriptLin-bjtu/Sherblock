/**
 * WebSocket Server - 处理客户端连接和消息
 */
import { WebSocketServer as WSServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import MessageHandler from './message-handler.js';

export class WebSocketServer {
    constructor(options = {}) {
        this.port = options.port || 8080;
        this.httpServer = null;
        this.wss = null;
        this.messageHandler = null;
        this.clients = new Map(); // clientId -> { ws, workspaces: Set }
    }

    /**
     * 启动独立的WebSocket服务器
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                // 创建HTTP服务器
                this.httpServer = createServer();

                // 创建WebSocket服务器
                this.wss = new WSServer({ server: this.httpServer });
                this.messageHandler = new MessageHandler(this);

                // 处理连接
                this.wss.on('connection', (ws, req) => {
                    const clientId = uuidv4();
                    console.log(`[WebSocketServer] Client connected: ${clientId}`);

                    this.clients.set(clientId, {
                        ws,
                        workspaces: new Set(),
                        subscribedWorkspaces: new Set()
                    });

                    // Handle incoming messages
                    ws.on('message', async (data) => {
                        try {
                            const message = JSON.parse(data.toString());
                            console.log(`[WebSocketServer] Received message: ${message.type}`);
                            const response = await this.messageHandler.handle(message, ws, clientId);
                            if (response) {
                                ws.send(JSON.stringify(response));
                            }
                        } catch (error) {
                            console.error('[WebSocketServer] Message error:', error);
                            ws.send(JSON.stringify({
                                id: Date.now().toString(),
                                type: 'ERROR',
                                timestamp: Date.now(),
                                payload: { error: error.message }
                            }));
                        }
                    });

                    // Handle client disconnect
                    ws.on('close', () => {
                        console.log(`[WebSocketServer] Client disconnected: ${clientId}`);
                        this.clients.delete(clientId);
                    });

                    // Handle errors
                    ws.on('error', (error) => {
                        console.error(`[WebSocketServer] Client error: ${clientId}`, error);
                        this.clients.delete(clientId);
                    });

                    // Send welcome message
                    ws.send(JSON.stringify({
                        id: uuidv4(),
                        type: 'CONNECTED',
                        timestamp: Date.now(),
                        payload: { clientId }
                    }));
                });

                this.wss.on('error', (error) => {
                    console.error('[WebSocketServer] Server error:', error);
                });

                // 启动HTTP服务器
                this.httpServer.listen(this.port, () => {
                    console.log(`[WebSocketServer] WebSocket server running on port ${this.port}`);
                    resolve(this.httpServer);
                });

                this.httpServer.on('error', (error) => {
                    console.error('[WebSocketServer] HTTP server error:', error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send message to a specific client
     */
    send(clientId, type, payload) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(JSON.stringify({
                id: uuidv4(),
                type,
                timestamp: Date.now(),
                payload
            }));
        }
    }

    /**
     * Send message to a specific workspace's subscribers
     */
    sendToWorkspace(workspaceId, type, payload) {
        this.clients.forEach((client, clientId) => {
            if (client.subscribedWorkspaces.has(workspaceId)) {
                this.send(clientId, type, payload);
            }
        });
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(type, payload, workspaceId = null) {
        const message = JSON.stringify({
            id: uuidv4(),
            type,
            timestamp: Date.now(),
            payload
        });

        // 检查是否有任何客户端订阅了指定的工作区
        let hasSubscribers = false;
        if (workspaceId) {
            for (const client of this.clients.values()) {
                if (client.subscribedWorkspaces.has(workspaceId)) {
                    hasSubscribers = true;
                    break;
                }
            }
        }

        this.clients.forEach((client, clientId) => {
            // 如果有指定 workspaceId 且有订阅者，只发给订阅者；否则发给所有客户端
            if (workspaceId && hasSubscribers && !client.subscribedWorkspaces.has(workspaceId)) {
                return;
            }
            if (client.ws.readyState === 1) {
                client.ws.send(message);
            }
        });
    }

    /**
     * Subscribe a client to a workspace
     */
    subscribeToWorkspace(clientId, workspaceId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.subscribedWorkspaces.add(workspaceId);
        }
    }

    /**
     * Unsubscribe a client from a workspace
     */
    unsubscribeFromWorkspace(clientId, workspaceId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.subscribedWorkspaces.delete(workspaceId);
        }
    }

    /**
     * Get client info
     */
    getClient(clientId) {
        return this.clients.get(clientId);
    }

    /**
     * Get all connected clients
     */
    getClients() {
        return this.clients;
    }

    /**
     * Stop the server
     */
    stop() {
        return new Promise((resolve) => {
            // Close all client connections
            this.clients.forEach((client) => {
                client.ws.close();
            });
            this.clients.clear();

            // Close server
            if (this.wss) {
                this.wss.close(() => {
                    console.log('[WebSocketServer] Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

export default WebSocketServer;