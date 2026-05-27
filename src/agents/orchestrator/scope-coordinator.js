/**
 * ScopeCoordinator - Scope 协调器
 * 在并行执行时安全地管理 scope 的读写冲突
 *
 * 使用 SQLite 事务替代应用层字段锁：
 * - 不同 scope_key 的并行写入互不阻塞
 * - 同一 scope_key 的写入由 SQLite busy_timeout 串行化
 * - 无需 _waitForLocks / _acquireFieldLock / _releaseFieldLock
 */

export class ScopeCoordinator {
    /**
     * @param {Object} scopeManager - ScopeManager 实例
     */
    constructor(scopeManager) {
        this.scopeManager = scopeManager;
    }

    /**
     * 请求读取 scope（并行执行时）
     * @param {string} taskId - 任务ID
     * @param {string[]} fields - 要读取的字段（可选，默认读取全部）
     * @returns {Promise<Object>} 当前 scope（快照）
     */
    async acquireRead(taskId, fields = null) {
        const repo = this.scopeManager.getScopeRepository();

        // If ScopeRepository is available, use field-level read
        if (repo) {
            if (fields && Array.isArray(fields)) {
                return repo.readFields(fields);
            }
            return repo.read();
        }

        // Fallback: original in-memory read
        let scope = this.scopeManager.get();

        if (!scope) {
            await this.scopeManager.read();
            scope = this.scopeManager.get() || {};
        }

        if (fields && Array.isArray(fields)) {
            const filteredScope = {};
            for (const field of fields) {
                if (scope[field] !== undefined) {
                    filteredScope[field] = scope[field];
                }
            }
            return filteredScope;
        }

        return scope;
    }

    /**
     * 请求写入 scope
     * SQLite 事务保证原子性，不同 scope_key 行互不阻塞
     * @param {string} taskId - 任务ID
     * @param {Object} updates - 要写入的更新
     * @returns {Promise<void>}
     */
    async acquireWrite(taskId, updates) {
        const repo = this.scopeManager.getScopeRepository();

        // If ScopeRepository is available, use transactional field-level write
        if (repo) {
            return repo.updateFields(taskId, updates);
        }

        // Fallback: original in-memory merge + write
        let currentScope = this.scopeManager.get();
        if (!currentScope) {
            await this.scopeManager.read();
            currentScope = this.scopeManager.get() || {};
        }

        const newScope = { ...currentScope };
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                newScope[key] = { ...(newScope[key] || {}), ...value };
            } else {
                newScope[key] = value;
            }
        }

        await this.scopeManager.write(newScope);
    }

    /**
     * 重置（兼容接口，无需清理锁状态）
     */
    reset() {
        // No-op: SQLite handles concurrency, no application locks to clear
    }

    /**
     * 获取当前锁状态（兼容接口，始终返回空状态）
     */
    getLockStatus() {
        return { lockedFields: [], taskLocks: {} };
    }
}
