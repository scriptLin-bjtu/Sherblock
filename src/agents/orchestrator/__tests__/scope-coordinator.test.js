/**
 * ScopeCoordinator 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScopeCoordinator } from '../scope-coordinator.js';

describe('ScopeCoordinator - Scope 协调器', () => {
    let scopeManager;
    let coordinator;

    beforeEach(() => {
        // Mock ScopeManager
        scopeManager = {
            _data: {},
            get() {
                return this._data;
            },
            read: vi.fn().mockResolvedValue(undefined),
            write: vi.fn().mockImplementation(function (data) {
                this._data = data;
                return Promise.resolve();
            }),
        };

        coordinator = new ScopeCoordinator(scopeManager);
    });

    describe('acquireRead - 读取 scope', () => {
        it('应返回当前 scope', async () => {
            scopeManager._data = { a: 1, b: 2 };

            const result = await coordinator.acquireRead('task_1');

            expect(result.a).toBe(1);
            expect(result.b).toBe(2);
        });

        it('应支持读取特定字段', async () => {
            scopeManager._data = { a: 1, b: 2, c: 3 };

            const result = await coordinator.acquireRead('task_1', ['a', 'c']);

            expect(result.a).toBe(1);
            expect(result.c).toBe(3);
            expect(result.b).toBeUndefined();
        });

        it('scope 为空时应读取文件', async () => {
            scopeManager._data = null;

            await coordinator.acquireRead('task_1');

            expect(scopeManager.read).toHaveBeenCalled();
        });
    });

    describe('acquireWrite - 写入 scope', () => {
        it('应正确写入数据', async () => {
            scopeManager._data = { existing: 'data' };

            await coordinator.acquireWrite('task_1', { newField: 'newValue' });

            expect(scopeManager._data.newField).toBe('newValue');
            expect(scopeManager._data.existing).toBe('data');
        });

        it('应深度合并对象', async () => {
            scopeManager._data = {
                nested: { a: 1, b: 2 },
            };

            await coordinator.acquireWrite('task_1', {
                nested: { b: 3, c: 4 },
            });

            expect(scopeManager._data.nested.a).toBe(1);
            expect(scopeManager._data.nested.b).toBe(3);
            expect(scopeManager._data.nested.c).toBe(4);
        });

        it('应正确释放锁', async () => {
            await coordinator.acquireWrite('task_1', { field1: 'value1' });

            // 锁应该在写入后释放（返回 falsy）
            expect(coordinator.isFieldLocked('field1')).toBeFalsy();
        });
    });

    describe('字段锁机制', () => {
        it('应正确追踪字段锁定状态', async () => {
            await coordinator.acquireWrite('task_1', { field1: 'value1' });

            // 写入后锁已释放（返回 falsy）
            expect(coordinator.isFieldLocked('field1')).toBeFalsy();
        });

        it('应获取字段的锁定者', async () => {
            const taskLocks = coordinator.getTaskLocks('task_1');

            expect(taskLocks).toBeDefined();
        });

        it('应获取任务持有的锁', async () => {
            const locks = coordinator.getTaskLocks('task_1');

            expect(locks).toBeInstanceOf(Set);
        });
    });

    describe('getLockStatus - 锁状态', () => {
        it('应返回当前锁状态', async () => {
            await coordinator.acquireWrite('task_1', { field1: 'value1' });

            const status = coordinator.getLockStatus();

            expect(status).toHaveProperty('lockedFields');
            expect(status).toHaveProperty('taskLocks');
        });
    });

    describe('reset - 重置', () => {
        it('应清除所有锁', async () => {
            await coordinator.acquireWrite('task_1', { field1: 'value1' });

            coordinator.reset();

            const status = coordinator.getLockStatus();
            expect(status.lockedFields).toHaveLength(0);
            expect(Object.keys(status.taskLocks)).toHaveLength(0);
        });
    });

    describe('并发场景', () => {
        it('应处理并发读取', async () => {
            scopeManager._data = { counter: 0 };

            const read1 = coordinator.acquireRead('task_1');
            const read2 = coordinator.acquireRead('task_2');

            const [result1, result2] = await Promise.all([read1, read2]);

            expect(result1.counter).toBe(0);
            expect(result2.counter).toBe(0);
        });
    });
});