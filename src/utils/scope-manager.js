import { workspaceManager } from './workspace-manager.js';
import { ScopeRepository } from '../db/scope-repository.js';

/**
 * Scope Manager - Manages workflow scope (pure SQLite, no file fallback)
 */
export class ScopeManager {
    constructor() {
        this.currentScope = null;
        this.scopeRepo = null;
    }

    /**
     * Initialize ScopeRepository bound to the current workspace
     */
    async initialize() {
        const workspaceId = workspaceManager.getWorkspaceId();
        if (!workspaceId) {
            throw new Error('[ScopeManager] Workspace must be initialized before ScopeManager');
        }
        this.scopeRepo = new ScopeRepository(workspaceId);
    }

    _ensureRepo() {
        if (!this.scopeRepo) {
            throw new Error('[ScopeManager] Not initialized. Call initialize() first.');
        }
        return this.scopeRepo;
    }

    /**
     * Read scope from DB
     * @returns {Promise<Object|null>}
     */
    async read() {
        const scope = this._ensureRepo().read();
        this.currentScope = scope;
        return scope;
    }

    /**
     * Write scope to DB
     * @param {Object} scope
     */
    async write(scope) {
        this.currentScope = scope;
        this._ensureRepo().write(scope);
    }

    /**
     * Update scope with partial updates (deep merge), DB-backed
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async update(updates) {
        const result = this._ensureRepo().update(updates);
        this.currentScope = result;
        return result;
    }

    /**
     * Get cached scope (no I/O)
     * @returns {Object|null}
     */
    get() {
        if (this.scopeRepo) {
            return this.scopeRepo.get() || this.currentScope;
        }
        return this.currentScope;
    }

    /**
     * Clear scope
     */
    async clear() {
        this.currentScope = null;
        if (this.scopeRepo) {
            this.scopeRepo.clear();
        }
    }

    /**
     * Get the underlying ScopeRepository (for parallel execution)
     * @returns {ScopeRepository|null}
     */
    getScopeRepository() {
        return this.scopeRepo;
    }
}

// Export singleton instance
export const scopeManager = new ScopeManager();
