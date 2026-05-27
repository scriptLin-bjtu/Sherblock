import { stat } from 'fs/promises';
import { Database } from './database.js';

export class ArtifactRepository {
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
     * Register a chart artifact
     */
    async addChart(workspaceId, metadata) {
        const db = this._ensureDb();
        const filePath = metadata.filePath || metadata.file_path || '';
        let fileSize = metadata.fileSize || metadata.file_size || 0;

        if (filePath && !fileSize) {
            try {
                const stats = await stat(filePath);
                fileSize = stats.size;
            } catch {
                // File may not exist yet
            }
        }

        this._ensureWorkspace(db, workspaceId);

        db.prepare(`
            INSERT INTO artifacts (workspace_id, artifact_type, filename, file_path, title, chart_type, file_size)
            VALUES (?, 'chart', ?, ?, ?, ?, ?)
        `).run(
            workspaceId,
            metadata.filename,
            filePath,
            metadata.title || null,
            metadata.chartType || metadata.chart_type || null,
            fileSize
        );

        this._logChange(workspaceId, 'artifact_added', JSON.stringify({ type: 'chart', filename: metadata.filename }));
    }

    /**
     * Register a report artifact
     */
    async addReport(workspaceId, metadata) {
        const db = this._ensureDb();
        const filePath = metadata.filePath || metadata.file_path || '';
        let fileSize = metadata.fileSize || metadata.file_size || 0;

        if (filePath && !fileSize) {
            try {
                const stats = await stat(filePath);
                fileSize = stats.size;
            } catch {
                // File may not exist yet
            }
        }

        this._ensureWorkspace(db, workspaceId);

        db.prepare(`
            INSERT INTO artifacts (workspace_id, artifact_type, filename, file_path, title, file_size)
            VALUES (?, 'report', ?, ?, ?, ?)
        `).run(
            workspaceId,
            metadata.filename,
            filePath,
            metadata.title || null,
            fileSize
        );

        this._logChange(workspaceId, 'artifact_added', JSON.stringify({ type: 'report', filename: metadata.filename }));
    }

    /**
     * List charts for a workspace
     */
    listCharts(workspaceId) {
        const db = this._ensureDb();
        return db.prepare(`
            SELECT id, filename, file_path, title, chart_type, file_size, created_at
            FROM artifacts WHERE workspace_id = ? AND artifact_type = 'chart'
            ORDER BY created_at DESC
        `).all(workspaceId);
    }

    /**
     * List reports for a workspace
     */
    listReports(workspaceId) {
        const db = this._ensureDb();
        return db.prepare(`
            SELECT id, filename, file_path, title, file_size, created_at
            FROM artifacts WHERE workspace_id = ? AND artifact_type = 'report'
            ORDER BY created_at DESC
        `).all(workspaceId);
    }

    /**
     * Get a specific artifact
     */
    getArtifact(workspaceId, type, filename) {
        const db = this._ensureDb();
        return db.prepare(`
            SELECT * FROM artifacts
            WHERE workspace_id = ? AND artifact_type = ? AND filename = ?
        `).get(workspaceId, type, filename);
    }

    /**
     * Delete an artifact
     */
    deleteArtifact(workspaceId, type, filename) {
        const db = this._ensureDb();
        db.prepare(`
            DELETE FROM artifacts
            WHERE workspace_id = ? AND artifact_type = ? AND filename = ?
        `).run(workspaceId, type, filename);
    }

    /**
     * Check if workspace has charts
     */
    hasCharts(workspaceId) {
        const db = this._ensureDb();
        const row = db.prepare(
            "SELECT 1 FROM artifacts WHERE workspace_id = ? AND artifact_type = 'chart' LIMIT 1"
        ).get(workspaceId);
        return !!row;
    }

    /**
     * Check if workspace has reports
     */
    hasReports(workspaceId) {
        const db = this._ensureDb();
        const row = db.prepare(
            "SELECT 1 FROM artifacts WHERE workspace_id = ? AND artifact_type = 'report' LIMIT 1"
        ).get(workspaceId);
        return !!row;
    }

    /**
     * Ensure workspace row exists (FK constraint)
     */
    _ensureWorkspace(db, workspaceId) {
        db.prepare(`
            INSERT OR IGNORE INTO workspaces (id, title, status)
            VALUES (?, ?, 'idle')
        `).run(workspaceId, workspaceId);
    }

    /**
     * Log a change
     */
    _logChange(workspaceId, changeType, changeDetail = null) {
        try {
            const db = this._ensureDb();
            db.prepare(`
                INSERT INTO change_log (workspace_id, change_type, change_detail)
                VALUES (?, ?, ?)
            `).run(workspaceId, changeType, changeDetail);
        } catch {
            // Don't fail artifact operations if change logging fails
        }
    }
}
