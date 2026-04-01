/**
 * HTTP Server - 提供静态文件服务和API
 */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class HttpServer {
    constructor(options = {}) {
        this.port = options.port || 3000;
        this.app = express();
        this.server = null;
        this.setupMiddleware();
    }

    setupMiddleware() {
        // CORS headers
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });

        // JSON body parser
        this.app.use(express.json());

        // Serve static files from frontend directory
        const frontendPath = join(__dirname, '../../frontend');
        this.app.use(express.static(frontendPath));

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });

        // API endpoints for workspace management
        this.app.get('/api/workspaces', this.getWorkspaces.bind(this));
        this.app.get('/api/workspaces/:id', this.getWorkspace.bind(this));
        this.app.delete('/api/workspaces/:id', this.deleteWorkspace.bind(this));
    }

    async getWorkspaces(req, res) {
        try {
            const { workspaceManager } = await import('../utils/workspace-manager.js');
            const workspaces = await workspaceManager.listWorkspaces();
            res.json({ workspaces });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getWorkspace(req, res) {
        try {
            const workspaceId = req.params.id;
            const { workspaceManager } = await import('../utils/workspace-manager.js');
            const workspace = await workspaceManager.getWorkspaceDetails(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            res.json(workspace);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteWorkspace(req, res) {
        try {
            const workspaceId = req.params.id;
            const { workspaceManager } = await import('../utils/workspace-manager.js');
            await workspaceManager.deleteWorkspace(workspaceId);
            res.json({ success: true, workspaceId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`[HttpServer] HTTP server running on port ${this.port}`);
                resolve(this.server);
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[HttpServer] HTTP server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getApp() {
        return this.app;
    }

    getServer() {
        return this.server;
    }
}

export default HttpServer;