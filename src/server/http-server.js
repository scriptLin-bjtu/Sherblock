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

        // API endpoint for workspace file access (charts, reports, logs)
        this.app.get('/api/workspace/:id/file/:type/:filename', this.getWorkspaceFile.bind(this));
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

    async getWorkspaceFile(req, res) {
        try {
            const { id, type, filename } = req.params;
            const validTypes = ['charts', 'reports', 'logs'];

            // Validate type
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: 'Invalid file type' });
            }

            // Security check: prevent path traversal
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            // Build file path
            const dataDir = join(process.cwd(), 'data');
            const filePath = join(dataDir, id, type, filename);

            // Verify file exists within data directory
            if (!filePath.startsWith(dataDir)) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Set Content-Type based on file extension
            if (filename.endsWith('.svg')) {
                res.setHeader('Content-Type', 'image/svg+xml');
            } else if (filename.endsWith('.md')) {
                res.setHeader('Content-Type', 'text/markdown;charset=utf-8');
            } else if (filename.endsWith('.json')) {
                res.setHeader('Content-Type', 'application/json');
            } else if (filename.endsWith('.log')) {
                res.setHeader('Content-Type', 'text/plain;charset=utf-8');
            } else if (filename.endsWith('.txt')) {
                res.setHeader('Content-Type', 'text/plain;charset=utf-8');
            }

            res.sendFile(filePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.status(404).json({ error: 'File not found' });
            } else {
                res.status(500).json({ error: error.message });
            }
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