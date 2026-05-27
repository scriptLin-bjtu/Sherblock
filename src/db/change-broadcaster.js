import { Database } from './database.js';

/**
 * ChangeBroadcaster - 替代 chokidar WorkspaceWatcher
 * 通过轮询 change_log 表检测数据变更，广播到 WebSocket 客户端
 */
export class ChangeBroadcaster {
    constructor(wsServer) {
        this.wsServer = wsServer;
        this.lastSeenId = 0;
        this.pollInterval = null;
        this.db = null;
    }

    /**
     * Start polling for changes
     */
    start() {
        try {
            this.db = Database.getInstance().getDb();
            // Initialize lastSeenId to the latest entry
            const row = this.db.prepare('SELECT MAX(id) as maxId FROM change_log').get();
            this.lastSeenId = row?.maxId || 0;
        } catch {
            this.db = null;
        }

        this.pollInterval = setInterval(() => this._poll(), 250);
        console.log('[ChangeBroadcaster] Started polling');
    }

    /**
     * Stop polling
     */
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        console.log('[ChangeBroadcaster] Stopped');
    }

    /**
     * Poll for new changes
     */
    _poll() {
        if (!this.db || !this.wsServer) return;

        try {
            const rows = this.db.prepare(`
                SELECT id, workspace_id, change_type, change_detail, timestamp
                FROM change_log WHERE id > ?
                ORDER BY id ASC
            `).all(this.lastSeenId);

            if (rows.length === 0) return;

            // Update last seen ID
            this.lastSeenId = rows[rows.length - 1].id;

            // Group changes by workspace
            const byWorkspace = new Map();
            for (const row of rows) {
                if (!byWorkspace.has(row.workspace_id)) {
                    byWorkspace.set(row.workspace_id, []);
                }
                byWorkspace.get(row.workspace_id).push(row);
            }

            // Broadcast to subscribed clients
            for (const [workspaceId, changes] of byWorkspace) {
                for (const change of changes) {
                    this._broadcastChange(workspaceId, change);
                }
            }
        } catch {
            // DB may be busy or closed
        }
    }

    /**
     * Broadcast a single change event via WebSocket
     */
    _broadcastChange(workspaceId, change) {
        const detail = change.change_detail ? JSON.parse(change.change_detail) : {};

        switch (change.change_type) {
            case 'scope_updated':
                this.wsServer.sendToWorkspace(workspaceId, 'SCOPE_UPDATED', {
                    workspaceId,
                    keys: detail.keys || [],
                });
                break;

            case 'log_appended':
                this.wsServer.sendToWorkspace(workspaceId, 'WORKFLOW_LOG_UPDATED', {
                    workspaceId,
                    entryType: detail.entryType,
                });
                break;

            case 'artifact_added':
                this.wsServer.sendToWorkspace(workspaceId, 'ARTIFACT_ADDED', {
                    workspaceId,
                    artifactType: detail.type,
                    filename: detail.filename,
                });
                break;

            case 'status_changed':
                this.wsServer.sendToWorkspace(workspaceId, 'STATUS_CHANGED', {
                    workspaceId,
                    status: detail.status,
                });
                break;
        }
    }
}
