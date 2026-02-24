import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Scope Manager - Manages workflow scope using JSON file for persistence
 */
export class ScopeManager {
    constructor(scopeDir = 'data') {
        this.scopeDir = scopeDir;
        this.scopeFile = join(process.cwd(), scopeDir, 'scope.json');
        this.currentScope = null;
    }

    /**
     * Initialize scope directory and file
     */
    async initialize() {
        try {
            await mkdir(join(process.cwd(), this.scopeDir), { recursive: true });
        } catch {
            // Directory already exists, ignore
        }
    }

    /**
     * Read scope from file
     * @returns {Promise<Object|null>} Scope object or null if file doesn't exist
     */
    async read() {
        try {
            const data = await readFile(this.scopeFile, 'utf-8');
            this.currentScope = JSON.parse(data);
            console.log(`[ScopeManager] Read scope from file: ${JSON.stringify(Object.keys(this.currentScope || {}), null, 2)}`);
            return this.currentScope;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('[ScopeManager] Scope file does not exist, returning null');
                return null;
            }
            console.error('[ScopeManager] Error reading scope file:', error.message);
            return null;
        }
    }

    /**
     * Write scope to file
     * @param {Object} scope - Scope object to write
     * @returns {Promise<void>}
     */
    async write(scope) {
        this.currentScope = scope;
        try {
            const data = JSON.stringify(scope, null, 2);
            await writeFile(this.scopeFile, data, 'utf-8');
            console.log(`[ScopeManager] Wrote scope to file: ${JSON.stringify(Object.keys(scope), null, 2)}`);
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
        return this.currentScope;
    }

    /**
     * Clear scope file
     * @returns {Promise<void>}
     */
    async clear() {
        this.currentScope = null;
        try {
            await writeFile(this.scopeFile, '{}', 'utf-8');
            console.log('[ScopeManager] Cleared scope file');
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
}

// Export singleton instance
export const scopeManager = new ScopeManager();
