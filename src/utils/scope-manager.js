import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { workspaceManager } from './workspace-manager.js';
import { ScopeRepository } from '../db/scope-repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Scope Manager - Manages workflow scope
 * Uses SQLite (ScopeRepository) as primary storage, falls back to JSON file
 */
export class ScopeManager {
    constructor(scopeDir = 'data') {
        this.scopeDir = scopeDir;
        this.scopeFile = join(process.cwd(), scopeDir, 'scope.json');
        this.currentScope = null;
        this.scopeRepo = null;
        this._useDb = false;
    }

    /**
     * Initialize scope directory and file
     */
    async initialize() {
        try {
            // Use workspace path if workspace is initialized, otherwise use default scopeDir
            let scopeDirPath = this.scopeDir;
            if (workspaceManager.isInitialized()) {
                scopeDirPath = workspaceManager.getScopePath();
            }
            await mkdir(scopeDirPath, { recursive: true });
            // Update scopeFile to use the workspace path
            if (workspaceManager.isInitialized()) {
                this.scopeFile = join(scopeDirPath, 'scope.json');
            } else {
                this.scopeFile = join(process.cwd(), this.scopeDir, 'scope.json');
            }

            // Initialize ScopeRepository if workspace is set
            const workspaceId = workspaceManager.getWorkspaceId();
            if (workspaceId) {
                try {
                    this.scopeRepo = new ScopeRepository(workspaceId);
                    this._useDb = true;
                } catch (error) {
                    console.warn('[ScopeManager] Failed to init ScopeRepository, using file fallback:', error.message);
                    this._useDb = false;
                }
            }
        } catch {
            // Directory already exists, ignore
        }
    }

    /**
     * Read scope
     * @returns {Promise<Object|null>} Scope object or null if file doesn't exist
     */
    async read() {
        if (this._useDb && this.scopeRepo) {
            const scope = this.scopeRepo.read();
            this.currentScope = scope;
            return scope;
        }

        // Fallback: file-based read
        try {
            const data = await readFile(this.scopeFile, 'utf-8');
            this.currentScope = JSON.parse(data);
            return this.currentScope;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error('[ScopeManager] Error reading scope file:', error.message);
            return null;
        }
    }

    /**
     * Write scope
     * @param {Object} scope - Scope object to write
     * @returns {Promise<void>}
     */
    async write(scope) {
        this.currentScope = scope;

        if (this._useDb && this.scopeRepo) {
            this.scopeRepo.write(scope);
            // Also write to file for backward compat during migration
            try {
                const data = JSON.stringify(scope, null, 2);
                await writeFile(this.scopeFile, data, 'utf-8');
            } catch {
                // Ignore file write errors when DB is primary
            }
            return;
        }

        // Fallback: file-based write
        try {
            const data = JSON.stringify(scope, null, 2);
            await writeFile(this.scopeFile, data, 'utf-8');
        } catch (error) {
            console.error('[ScopeManager] Error writing scope file:', error.message);
            throw error;
        }
    }

    /**
     * Update scope with partial updates (deep merge)
     * @param {Object} updates - Partial updates to apply
     * @returns {Promise<Object>} Updated scope
     */
    async update(updates) {
        if (this._useDb && this.scopeRepo) {
            const result = this.scopeRepo.update(updates);
            this.currentScope = result;
            // Also write to file for backward compat
            try {
                const data = JSON.stringify(result, null, 2);
                await writeFile(this.scopeFile, data, 'utf-8');
            } catch {
                // Ignore file write errors
            }
            return result;
        }

        // Fallback: file-based update
        if (!this.currentScope) {
            await this.read();
        }

        const newScope = { ...(this.currentScope || {}) };

        // Deep merge updates
        for (const key of Object.keys(updates)) {
            if (
                newScope[key] !== undefined &&
                typeof newScope[key] === 'object' &&
                typeof updates[key] === 'object' &&
                !Array.isArray(updates[key])
            ) {
                newScope[key] = { ...newScope[key], ...updates[key] };
            } else {
                newScope[key] = updates[key];
            }
        }

        await this.write(newScope);
        return newScope;
    }

    /**
     * Get current scope from memory
     * @returns {Object|null} Current scope
     */
    get() {
        if (this._useDb && this.scopeRepo) {
            return this.scopeRepo.get() || this.currentScope;
        }
        return this.currentScope;
    }

    /**
     * Clear scope
     * @returns {Promise<void>}
     */
    async clear() {
        this.currentScope = null;

        if (this._useDb && this.scopeRepo) {
            this.scopeRepo.clear();
        }

        try {
            await writeFile(this.scopeFile, '{}', 'utf-8');
        } catch (error) {
            console.error('[ScopeManager] Error clearing scope file:', error.message);
        }
    }

    /**
     * Get scope file path
     * @returns {string} Path to scope file
     */
    getScopeFilePath() {
        return this.scopeFile;
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
