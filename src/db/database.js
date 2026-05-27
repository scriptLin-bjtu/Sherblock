import BetterSqlite3 from 'better-sqlite3';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'sherblock.db');

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS workspaces (
    id           TEXT PRIMARY KEY,
    title        TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    status       TEXT NOT NULL DEFAULT 'idle'
);

CREATE TABLE IF NOT EXISTS scope_entries (
    workspace_id TEXT NOT NULL,
    scope_key    TEXT NOT NULL,
    scope_value  TEXT NOT NULL,
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_by   TEXT,
    PRIMARY KEY (workspace_id, scope_key),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    entry_type   TEXT NOT NULL,
    role         TEXT,
    agent        TEXT,
    content      TEXT,
    entry_data   TEXT,
    timestamp    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    level        TEXT NOT NULL DEFAULT 'LOG',
    message      TEXT NOT NULL,
    timestamp    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artifacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id  TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    filename      TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    title         TEXT,
    chart_type    TEXT,
    file_size     INTEGER,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS change_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id  TEXT NOT NULL,
    change_type   TEXT NOT NULL,
    change_detail TEXT,
    timestamp     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
CREATE INDEX IF NOT EXISTS idx_scope_workspace ON scope_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_workspace ON workflow_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_type ON workflow_logs(workspace_id, entry_type);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_timestamp ON workflow_logs(workspace_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_session_logs_workspace ON session_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_workspace ON artifacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(workspace_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_change_log_workspace ON change_log(workspace_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_change_log_timestamp ON change_log(timestamp);
`;

export class Database {
    constructor(dbPath = DEFAULT_DB_PATH) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async open() {
        await mkdir(dirname(this.dbPath), { recursive: true });

        this.db = new BetterSqlite3(this.dbPath);

        // WAL mode: concurrent reads + serialized writes
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('busy_timeout = 5000');

        // Run schema creation
        this.db.exec(SCHEMA_DDL);

        console.log(`[Database] Opened: ${this.dbPath}`);
    }

    close() {
        if (this.db) {
            try {
                this.db.pragma('optimize');
            } catch {
                // Ignore optimize errors on close
            }
            this.db.close();
            this.db = null;
            console.log('[Database] Closed');
        }
    }

    getDb() {
        if (!this.db) {
            throw new Error('Database not opened. Call open() first.');
        }
        return this.db;
    }

    static getInstance() {
        if (!Database._instance) {
            Database._instance = new Database();
        }
        return Database._instance;
    }
}
