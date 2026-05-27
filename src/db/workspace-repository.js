import { mkdir, rm, stat, readdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { Database } from './database.js';

export class WorkspaceRepository {
    constructor() {
        this.db = null;
    }

    _ensureDb() {
        if (!this.db) {
            this.db = Database.getInstance().getDb();
        }
        return this.db;
    }

    /**
     * Create a new workspace (DB row + filesystem directories)
     */
    async create(workspaceId = null, title = null) {
        const db = this._ensureDb();
        const id = workspaceId || this._generateWorkspaceId();
        const workspacePath = join(process.cwd(), 'data', id);

        // Create filesystem directories
        await mkdir(workspacePath, { recursive: true });
        await mkdir(join(workspacePath, 'charts'), { recursive: true });
        await mkdir(join(workspacePath, 'reports'), { recursive: true });

        // Insert into database
        db.prepare(`
            INSERT OR IGNORE INTO workspaces (id, title, status)
            VALUES (?, ?, 'idle')
        `).run(id, title || id);

        return id;
    }

    /**
     * List all workspaces
     */
    async list() {
        const db = this._ensureDb();
        const rows = db.prepare(`
            SELECT w.id, w.title, w.created_at, w.updated_at, w.status,
                   (SELECT COUNT(*) FROM artifacts a WHERE a.workspace_id = w.id AND a.artifact_type = 'chart') AS chart_count,
                   (SELECT COUNT(*) FROM artifacts a WHERE a.workspace_id = w.id AND a.artifact_type = 'report') AS report_count
            FROM workspaces w
            ORDER BY w.created_at DESC
        `).all();

        return rows.map(row => ({
            workspaceId: row.id,
            title: row.title || row.id,
            createdAt: new Date(row.created_at).getTime(),
            status: row.status,
            hasCharts: row.chart_count > 0,
            hasReports: row.report_count > 0,
        }));
    }

    /**
     * Get workspace by ID
     */
    async getById(workspaceId) {
        const db = this._ensureDb();
        const row = db.prepare(`
            SELECT id, title, created_at, updated_at, status
            FROM workspaces WHERE id = ?
        `).get(workspaceId);

        if (!row) return null;

        return {
            workspaceId: row.id,
            title: row.title || row.id,
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime(),
            status: row.status,
        };
    }

    /**
     * Update workspace status
     */
    updateStatus(workspaceId, status) {
        const db = this._ensureDb();
        db.prepare(`
            UPDATE workspaces SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ?
        `).run(status, workspaceId);

        this._logChange(workspaceId, 'status_changed', JSON.stringify({ status }));
    }

    /**
     * Update workspace title
     */
    updateTitle(workspaceId, title) {
        const db = this._ensureDb();
        db.prepare(`
            UPDATE workspaces SET title = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ?
        `).run(title, workspaceId);
    }

    /**
     * Update workspace updated_at timestamp
     */
    touch(workspaceId) {
        const db = this._ensureDb();
        db.prepare(`
            UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ?
        `).run(workspaceId);
    }

    /**
     * Delete workspace (DB rows via CASCADE + filesystem directory)
     */
    async delete(workspaceId) {
        const db = this._ensureDb();
        const workspacePath = join(process.cwd(), 'data', workspaceId);

        // Delete from database (CASCADE deletes scope_entries, logs, artifacts, change_log)
        db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId);

        // Delete filesystem directory
        try {
            await rm(workspacePath, { recursive: true, force: true });
        } catch {
            // Directory may not exist
        }
    }

    /**
     * Check if workspace exists in database
     */
    exists(workspaceId) {
        const db = this._ensureDb();
        const row = db.prepare('SELECT 1 FROM workspaces WHERE id = ?').get(workspaceId);
        return !!row;
    }

    /**
     * Generate workspace ID: workspace-YYYYMMDD-HHmmss-{6chars}
     */
    _generateWorkspaceId() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = (
            now.getFullYear() +
            pad(now.getMonth() + 1) +
            pad(now.getDate()) + '-' +
            pad(now.getHours()) +
            pad(now.getMinutes()) +
            pad(now.getSeconds())
        );
        const randomSuffix = randomBytes(3).toString('hex').toLowerCase();
        return `workspace-${timestamp}-${randomSuffix}`;
    }

    /**
     * Log a change to the change_log table
     */
    _logChange(workspaceId, changeType, changeDetail = null) {
        const db = this._ensureDb();
        db.prepare(`
            INSERT INTO change_log (workspace_id, change_type, change_detail)
            VALUES (?, ?, ?)
        `).run(workspaceId, changeType, changeDetail);
    }
}
