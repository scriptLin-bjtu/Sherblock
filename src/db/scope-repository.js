import { Database } from './database.js';

export class ScopeRepository {
    constructor(workspaceId) {
        this.workspaceId = workspaceId;
        this.cache = null;
        this.db = null;
    }

    _ensureDb() {
        if (!this.db) {
            this.db = Database.getInstance().getDb();
        }
        return this.db;
    }

    setWorkspaceId(workspaceId) {
        this.workspaceId = workspaceId;
        this.cache = null;
    }

    /**
     * Read full scope (reconstruct from key-value rows)
     */
    read() {
        const db = this._ensureDb();
        const rows = db.prepare(
            'SELECT scope_key, scope_value FROM scope_entries WHERE workspace_id = ?'
        ).all(this.workspaceId);

        if (rows.length === 0) {
            this.cache = null;
            return null;
        }

        const scope = {};
        for (const row of rows) {
            scope[row.scope_key] = JSON.parse(row.scope_value);
        }

        this.cache = scope;
        return scope;
    }

    /**
     * Write full scope (replace all key-value rows in a transaction)
     */
    write(scope) {
        const db = this._ensureDb();
        const entries = Object.entries(scope);

        const transaction = db.transaction(() => {
            this._ensureWorkspace(db);
            db.prepare('DELETE FROM scope_entries WHERE workspace_id = ?')
                .run(this.workspaceId);

            const insert = db.prepare(`
                INSERT INTO scope_entries (workspace_id, scope_key, scope_value, updated_by)
                VALUES (?, ?, ?, NULL)
            `);

            for (const [key, value] of entries) {
                insert.run(this.workspaceId, key, JSON.stringify(value));
            }
        });

        transaction();
        this.cache = { ...scope };

        this._logChange('scope_updated', JSON.stringify({ keys: Object.keys(scope) }));
    }

    /**
     * Update scope with partial updates (deep merge, matching ScopeManager behavior)
     */
    update(updates) {
        const db = this._ensureDb();

        const transaction = db.transaction(() => {
            this._ensureWorkspace(db);
            // Read current values for merging
            for (const [key, value] of Object.entries(updates)) {
                const row = db.prepare(
                    'SELECT scope_value FROM scope_entries WHERE workspace_id = ? AND scope_key = ?'
                ).get(this.workspaceId, key);

                let mergedValue;
                if (row) {
                    const currentVal = JSON.parse(row.scope_value);
                    // Deep merge: objects shallow-merge, arrays/primitives replace
                    if (
                        currentVal !== null &&
                        typeof currentVal === 'object' &&
                        !Array.isArray(currentVal) &&
                        typeof value === 'object' &&
                        value !== null &&
                        !Array.isArray(value)
                    ) {
                        mergedValue = { ...currentVal, ...value };
                    } else {
                        mergedValue = value;
                    }
                } else {
                    mergedValue = value;
                }

                db.prepare(`
                    INSERT INTO scope_entries (workspace_id, scope_key, scope_value, updated_by, updated_at)
                    VALUES (?, ?, ?, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
                    ON CONFLICT(workspace_id, scope_key) DO UPDATE SET
                        scope_value = excluded.scope_value,
                        updated_by = excluded.updated_by,
                        updated_at = excluded.updated_at
                `).run(this.workspaceId, key, JSON.stringify(mergedValue));
            }
        });

        transaction();

        // Update cache
        if (!this.cache) {
            this.read();
        } else {
            for (const [key, value] of Object.entries(updates)) {
                if (
                    this.cache[key] !== undefined &&
                    typeof this.cache[key] === 'object' &&
                    this.cache[key] !== null &&
                    !Array.isArray(this.cache[key]) &&
                    typeof value === 'object' &&
                    value !== null &&
                    !Array.isArray(value)
                ) {
                    this.cache[key] = { ...this.cache[key], ...value };
                } else {
                    this.cache[key] = value;
                }
            }
        }

        this._logChange('scope_updated', JSON.stringify({ keys: Object.keys(updates) }));
        return this.cache;
    }

    /**
     * Read specific fields only (for parallel execution)
     */
    readFields(fields) {
        const db = this._ensureDb();
        const placeholders = fields.map(() => '?').join(',');
        const rows = db.prepare(
            `SELECT scope_key, scope_value FROM scope_entries WHERE workspace_id = ? AND scope_key IN (${placeholders})`
        ).all(this.workspaceId, ...fields);

        const result = {};
        for (const row of rows) {
            result[row.scope_key] = JSON.parse(row.scope_value);
        }
        return result;
    }

    /**
     * Write specific fields with taskId tracking (for parallel execution)
     * Uses SQLite transaction for atomicity — replaces ScopeCoordinator field locking
     */
    updateFields(taskId, updates) {
        const db = this._ensureDb();

        const transaction = db.transaction(() => {
            this._ensureWorkspace(db);
            for (const [key, value] of Object.entries(updates)) {
                const row = db.prepare(
                    'SELECT scope_value FROM scope_entries WHERE workspace_id = ? AND scope_key = ?'
                ).get(this.workspaceId, key);

                let mergedValue;
                if (row) {
                    const currentVal = JSON.parse(row.scope_value);
                    if (
                        currentVal !== null &&
                        typeof currentVal === 'object' &&
                        !Array.isArray(currentVal) &&
                        typeof value === 'object' &&
                        value !== null &&
                        !Array.isArray(value)
                    ) {
                        mergedValue = { ...currentVal, ...value };
                    } else {
                        mergedValue = value;
                    }
                } else {
                    mergedValue = value;
                }

                db.prepare(`
                    INSERT INTO scope_entries (workspace_id, scope_key, scope_value, updated_by, updated_at)
                    VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
                    ON CONFLICT(workspace_id, scope_key) DO UPDATE SET
                        scope_value = excluded.scope_value,
                        updated_by = excluded.updated_by,
                        updated_at = excluded.updated_at
                `).run(this.workspaceId, key, JSON.stringify(mergedValue), taskId);
            }
        });

        transaction();

        // Invalidate cache so next read() fetches fresh data
        this.cache = null;

        this._logChange('scope_updated', JSON.stringify({ keys: Object.keys(updates), taskId }));
    }

    /**
     * Get current scope from memory cache
     */
    get() {
        return this.cache;
    }

    /**
     * Clear scope
     */
    clear() {
        const db = this._ensureDb();
        db.prepare('DELETE FROM scope_entries WHERE workspace_id = ?')
            .run(this.workspaceId);
        this.cache = null;
    }

    /**
     * Ensure workspace row exists before writing scope entries (FK constraint)
     */
    _ensureWorkspace(db) {
        db.prepare(`
            INSERT OR IGNORE INTO workspaces (id, title, status)
            VALUES (?, ?, 'idle')
        `).run(this.workspaceId, this.workspaceId);
    }

    /**
     * Log a change to the change_log table
     */
    _logChange(changeType, changeDetail = null) {
        try {
            const db = this._ensureDb();
            db.prepare(`
                INSERT INTO change_log (workspace_id, change_type, change_detail)
                VALUES (?, ?, ?)
            `).run(this.workspaceId, changeType, changeDetail);
        } catch {
            // Don't fail scope operations if change logging fails
        }
    }
}
