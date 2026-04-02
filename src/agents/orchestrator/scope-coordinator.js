/**
 * ScopeCoordinator - Scope 协调器
 * 在并行执行时安全地管理 scope 的读写冲突
 */

export class ScopeCoordinator {
    /**
     * @param {Object} scopeManager - ScopeManager 实例
     */
    constructor(scopeManager) {
        this.scopeManager = scopeManager;
        this.locks = new Map();         // 字段锁：fieldName -> Set<taskId>
        this.taskLocks = new Map();     // 任务持有的锁：taskId -> Set<fieldName>
        this.pendingReads = new Map();  // 待处理的读请求
        this.pendingWrites = new Map(); // 待处理的写请求

        // 并发配置
        this.maxLockWaitTime = 30000;   // 最大等待锁时间（毫秒）
    }

    /**
     * 请求读取 scope（并行执行时）
     * @param {string} taskId - 任务ID
     * @param {string[]} fields - 要读取的字段（可选，默认读取全部）
     * @returns {Promise<Object>} 当前 scope（快照）
     */
    async acquireRead(taskId, fields = null) {
        // 读取当前 scope
        let scope = this.scopeManager.get();

        if (!scope) {
            await this.scopeManager.read();
            scope = this.scopeManager.get() || {};
        }

        // 如果指定了特定字段，只返回这些字段
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
     * @param {string} taskId - 任务ID
     * @param {Object} updates - 要写入的更新
     * @returns {Promise<void>}
     */
    async acquireWrite(taskId, updates) {
        // 计算要写入的字段
        const fields = Object.keys(updates);

        // 检查字段是否被锁定
        await this._waitForLocks(taskId, fields);

        // 获取写锁
        for (const field of fields) {
            this._acquireFieldLock(field, taskId);
        }

        try {
            // 读取当前 scope
            let currentScope = this.scopeManager.get();
            if (!currentScope) {
                await this.scopeManager.read();
                currentScope = this.scopeManager.get() || {};
            }

            // 合并更新
            const newScope = { ...currentScope };
            for (const [key, value] of Object.entries(updates)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // 深度合并对象
                    newScope[key] = { ...(newScope[key] || {}), ...value };
                } else {
                    newScope[key] = value;
                }
            }

            // 写入 scope
            await this.scopeManager.write(newScope);
        } finally {
            // 释放锁
            for (const field of fields) {
                this._releaseFieldLock(field, taskId);
            }
        }
    }

    /**
     * 检查字段是否被锁定
     * @param {string} field - 字段名
     * @returns {boolean}
     */
    isFieldLocked(field) {
        const locks = this.locks.get(field);
        return locks && locks.size > 0;
    }

    /**
     * 获取字段的当前锁定者
     * @param {string} field - 字段名
     * @returns {Set<string>} 锁定该字段的任务ID集合
     */
    getFieldLockers(field) {
        return this.locks.get(field) || new Set();
    }

    /**
     * 获取任务持有的锁
     * @param {string} taskId - 任务ID
     * @returns {Set<string>} 任务持有的字段集合
     */
    getTaskLocks(taskId) {
        return this.taskLocks.get(taskId) || new Set();
    }

    /**
     * 等待字段解锁
     * @private
     */
    async _waitForLocks(taskId, fields) {
        const startTime = Date.now();

        while (true) {
            let allUnlocked = true;

            for (const field of fields) {
                if (this.isFieldLocked(field)) {
                    const lockers = this.getFieldLockers(field);
                    // 检查是否被自己锁定（允许重入）
                    if (!lockers.has(taskId)) {
                        allUnlocked = false;
                        break;
                    }
                }
            }

            if (allUnlocked) {
                break;
            }

            // 检查超时
            if (Date.now() - startTime > this.maxLockWaitTime) {
                throw new Error(`Timeout waiting for locks on fields: ${fields.join(', ')}`);
            }

            // 等待一段时间后重试
            await this._sleep(100);
        }
    }

    /**
     * 获取字段锁
     * @private
     */
    _acquireFieldLock(field, taskId) {
        if (!this.locks.has(field)) {
            this.locks.set(field, new Set());
        }
        this.locks.get(field).add(taskId);

        if (!this.taskLocks.has(taskId)) {
            this.taskLocks.set(taskId, new Set());
        }
        this.taskLocks.get(taskId).add(field);
    }

    /**
     * 释放字段锁
     * @private
     */
    _releaseFieldLock(field, taskId) {
        const locks = this.locks.get(field);
        if (locks) {
            locks.delete(taskId);
            if (locks.size === 0) {
                this.locks.delete(field);
            }
        }

        const taskLocks = this.taskLocks.get(taskId);
        if (taskLocks) {
            taskLocks.delete(field);
            if (taskLocks.size === 0) {
                this.taskLocks.delete(taskId);
            }
        }
    }

    /**
     * 睡眠
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取当前所有锁的状态（用于调试）
     * @returns {Object} 锁状态
     */
    getLockStatus() {
        const status = {
            lockedFields: [],
            taskLocks: {},
        };

        for (const [field, lockers] of this.locks) {
            status.lockedFields.push({
                field,
                lockers: Array.from(lockers),
            });
        }

        for (const [taskId, fields] of this.taskLocks) {
            status.taskLocks[taskId] = Array.from(fields);
        }

        return status;
    }

    /**
     * 重置所有锁（用于清理或错误恢复）
     */
    reset() {
        this.locks.clear();
        this.taskLocks.clear();
        this.pendingReads.clear();
        this.pendingWrites.clear();
    }
}