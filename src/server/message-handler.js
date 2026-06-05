/**
 * Message Handler - 处理所有WebSocket消息
 */
import { v4 as uuidv4 } from 'uuid';
import { readdir, readFile, stat, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { workspaceManager } from '../utils/workspace-manager.js';
import { scopeManager } from '../utils/scope-manager.js';
import { Database } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class MessageHandler {
    constructor(wsServer) {
        this.wsServer = wsServer;
        this.activeWorkflows = new Map(); // workspaceId -> OrchestratorAdapter
    }

    async handle(message, ws, clientId) {
        const { type, payload, id } = message;

        try {
            switch (type) {
                case 'INIT':
                    return await this.handleInit(message, ws, clientId);

                case 'GET_WORKSPACES':
                    return await this.handleGetWorkspaces(message);

                case 'GET_WORKSPACE':
                    return await this.handleGetWorkspace(message, ws, clientId);

                case 'CREATE_WORKSPACE':
                    return await this.handleCreateWorkspace(message, ws, clientId);

                case 'DELETE_WORKSPACE':
                    return await this.handleDeleteWorkspace(message);

                case 'START_ANALYSIS':
                    return await this.handleStartAnalysis(message, ws, clientId);

                case 'USER_INPUT':
                    return await this.handleUserInput(message, ws, clientId);

                case 'PAUSE_WORKFLOW':
                    return await this.handlePauseWorkflow(message);

                case 'RESUME_WORKFLOW':
                    return await this.handleResumeWorkflow(message);

                case 'STOP_WORKFLOW':
                    return await this.handleStopWorkflow(message);

                case 'GET_LOGS':
                    return await this.handleGetLogs(message);

                case 'GET_CHARTS':
                    return await this.handleGetCharts(message);

                case 'GET_REPORTS':
                    return await this.handleGetReports(message);

                case 'GET_REPORT_CONTENT':
                    return await this.handleGetReportContent(message);

                case 'GET_LOG_CONTENT':
                    return await this.handleGetLogContent(message);

                case 'GET_WORKFLOW_LOG':
                    return await this.handleGetWorkflowLog(message);

                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
        } catch (error) {
            console.error(`[MessageHandler] Error handling ${type}:`, error);
            return {
                id: id || uuidv4(),
                type: 'ERROR',
                timestamp: Date.now(),
                payload: { error: error.message }
            };
        }
    }

    /**
     * 处理初始化消息
     */
    async handleInit(message, ws, clientId) {
        const { apiKeys } = message.payload || {};

        // 设置API密钥
        if (apiKeys) {
            if (apiKeys.deepseek) process.env.DEEPSEEK_API_KEY = apiKeys.deepseek;
            if (apiKeys.etherscan) process.env.ETHERSCAN_API_KEY = apiKeys.etherscan;
        }

        const workspaces = await this.listWorkspaces();

        return {
            id: message.id,
            type: 'INIT_RESPONSE',
            timestamp: Date.now(),
            payload: {
                workspaces,
                config: {
                    httpPort: 3000,
                    wsPort: 8080
                }
            }
        };
    }

    /**
     * 获取工作区列表
     */
    async handleGetWorkspaces(message) {
        const workspaces = await this.listWorkspaces();

        return {
            id: message.id,
            type: 'WORKSPACES_LIST',
            timestamp: Date.now(),
            payload: { workspaces }
        };
    }

    /**
     * 获取工作区详情
     */
    async handleGetWorkspace(message, ws, clientId) {
        const { workspaceId } = message.payload;

        if (!workspaceId) {
            throw new Error('workspaceId is required');
        }

        // 订阅该工作区
        this.wsServer.subscribeToWorkspace(clientId, workspaceId);

        // 如果该 workspace 有活跃 adapter，重连到新客户端
        const activeAdapter = this.activeWorkflows.get(workspaceId);
        if (activeAdapter) {
            activeAdapter.reconnect(clientId);

            // 发送状态恢复消息，帮助前端恢复 UI（如待回答的问题）
            const adapterState = activeAdapter.getStateRecovery();
            if (adapterState.isAwaitingInput || ['collecting', 'planning', 'executing'].includes(adapterState.stage)) {
                // 异步发送，不阻塞当前响应
                setImmediate(() => {
                    this.wsServer.send(clientId, 'WORKFLOW_STATE_RECOVERY', {
                        workspaceId,
                        ...adapterState,
                    });
                });
            }
        }

        const workspacePath = join(process.cwd(), 'data', workspaceId);

        try {
            const [workspaceInfo, charts, reports] = await Promise.all([
                this.getWorkspaceInfo(workspacePath, workspaceId),
                this.readFiles(workspacePath, 'charts'),
                this.readFiles(workspacePath, 'reports')
            ]);

            // logs 从 SQLite session_logs 表读取
            const logs = this._readSessionLogs(workspaceId);

            return {
                id: message.id,
                type: 'WORKSPACE_DETAILS',
                timestamp: Date.now(),
                payload: {
                    workspaceId,
                    scope: workspaceInfo?.scope,
                    charts,
                    reports,
                    logs,
                    workflowStatus: this._overlayActiveAdapterState(workspaceId, workspaceInfo?.workflowStatus)
                }
            };
        } catch (error) {
            // 工作区可能不存在
            if (error.code === 'ENOENT') {
                return {
                    id: message.id,
                    type: 'WORKSPACE_DETAILS',
                    timestamp: Date.now(),
                    payload: {
                        workspaceId,
                        scope: null,
                        charts: [],
                        reports: [],
                        logs: [],
                        workflowStatus: null
                    }
                };
            }
            throw error;
        }
    }

    /**
     * 创建工作区
     */
    async handleCreateWorkspace(message, ws, clientId) {
        const { title } = message.payload || {};

        // 重置工作区状态并创建新工作区
        await workspaceManager.reset();
        await workspaceManager.initialize();
        const workspaceId = workspaceManager.getWorkspaceId();

        // 订阅该工作区
        this.wsServer.subscribeToWorkspace(clientId, workspaceId);

        // 广播工作区列表更新
        const workspaces = await this.listWorkspaces();
        this.wsServer.broadcast('WORKSPACES_LIST', { workspaces });

        return {
            id: message.id,
            type: 'WORKSPACE_CREATED',
            timestamp: Date.now(),
            payload: { workspaceId, title: title || workspaceId }
        };
    }

    /**
     * 删除工作区
     */
    async handleDeleteWorkspace(message) {
        const { workspaceId } = message.payload;

        if (!workspaceId) {
            throw new Error('workspaceId is required');
        }

        const workspacePath = join(process.cwd(), 'data', workspaceId);

        // Check if workspace exists (in DB or filesystem)
        try {
            const db = Database.getInstance().getDb();
            const row = db.prepare('SELECT 1 FROM workspaces WHERE id = ?').get(workspaceId);
            if (!row) {
                // Also check filesystem
                await stat(workspacePath);
            }
            // Delete from database (CASCADE removes all related data)
            db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('Workspace not found');
            }
            // If DB fails, still try filesystem
        }

        // Delete filesystem directory
        try {
            await rm(workspacePath, { recursive: true, force: true });
        } catch {
            // Directory may not exist
        }

        // 广播工作区列表更新
        this.wsServer.broadcast('WORKSPACES_LIST', {
            workspaces: await this.listWorkspaces()
        });

        return {
            id: message.id,
            type: 'WORKSPACE_DELETED',
            timestamp: Date.now(),
            payload: { workspaceId }
        };
    }

    /**
     * 启动分析
     */
    async handleStartAnalysis(message, ws, clientId) {
        const { workspaceId, input } = message.payload;

        if (!workspaceId) {
            throw new Error('workspaceId is required');
        }
        if (!input) {
            throw new Error('input is required');
        }

        // 检查是否已有活跃的工作流
        const existingAdapter = this.activeWorkflows.get(workspaceId);
        if (existingAdapter) {
            const adapterState = existingAdapter.getStateRecovery();

            if (adapterState.isAwaitingInput) {
                // 重连：更新 adapter 的 clientId，将用户消息作为回答
                console.log(`[MessageHandler] Reconnecting existing workflow for workspace ${workspaceId}`);

                existingAdapter.reconnect(clientId);
                existingAdapter.handleUserInput(input);

                // 发送状态恢复消息给新客户端
                this.wsServer.send(clientId, 'WORKFLOW_STATE_RECOVERY', {
                    workspaceId,
                    ...adapterState,
                });

                return {
                    id: message.id,
                    type: 'ANALYSIS_RECONNECTED',
                    timestamp: Date.now(),
                    payload: { workspaceId, stage: adapterState.stage }
                };
            } else if (['collecting', 'planning', 'executing'].includes(adapterState.stage)) {
                // 活跃工作流但不在等待输入（如 LLM 处理中）
                // 重连事件通道，但不喂入用户输入
                console.log(`[MessageHandler] Reconnecting existing workflow (stage: ${adapterState.stage}) for workspace ${workspaceId}`);

                existingAdapter.reconnect(clientId);

                // 发送状态恢复消息
                this.wsServer.send(clientId, 'WORKFLOW_STATE_RECOVERY', {
                    workspaceId,
                    ...adapterState,
                });

                return {
                    id: message.id,
                    type: 'ANALYSIS_RECONNECTED',
                    timestamp: Date.now(),
                    payload: { workspaceId, stage: adapterState.stage }
                };
            }
            // 如果工作流已完成或空闲，继续创建新 adapter
        }

        console.log(`[MessageHandler] Starting analysis for workspace ${workspaceId}`);

        // 创建Orchestrator适配器（默认启用并行执行）
        const { OrchestratorAdapter } = await import('../adapters/orchestrator-adapter.js');
        const adapter = new OrchestratorAdapter(this.wsServer, workspaceId, clientId, {
            useParallelExecution: true,
            maxParallelTasks: parseInt(process.env.MAX_PARALLEL_TASKS, 10) || 3,
            continueOnFailure: true,
        });

        this.activeWorkflows.set(workspaceId, adapter);

        // 异步启动分析
        adapter.run(input).then(result => {
            this.activeWorkflows.delete(workspaceId);
        }).catch(error => {
            console.error(`[MessageHandler] Analysis error:`, error);
            this.wsServer.send(clientId, 'ERROR', {
                workspaceId,
                error: error.message
            });
            this.activeWorkflows.delete(workspaceId);
        });

        return {
            id: message.id,
            type: 'ANALYSIS_STARTED',
            timestamp: Date.now(),
            payload: { workspaceId }
        };
    }

    /**
     * 处理用户输入（响应Agent的问题）
     */
    async handleUserInput(message, ws, clientId) {
        const { workspaceId, input } = message.payload;

        if (!workspaceId) {
            throw new Error('workspaceId is required');
        }

        const adapter = this.activeWorkflows.get(workspaceId);
        if (adapter) {
            adapter.handleUserInput(input);
        }

        return {
            id: message.id,
            type: 'USER_INPUT_ACKNOWLEDGED',
            timestamp: Date.now(),
            payload: { workspaceId }
        };
    }

    /**
     * 暂停工作流
     */
    async handlePauseWorkflow(message) {
        const { workspaceId } = message.payload;

        const adapter = this.activeWorkflows.get(workspaceId);
        if (adapter) {
            adapter.pause();
        }

        return {
            id: message.id,
            type: 'WORKFLOW_PAUSED',
            timestamp: Date.now(),
            payload: { workspaceId }
        };
    }

    /**
     * 恢复工作流
     */
    async handleResumeWorkflow(message) {
        const { workspaceId } = message.payload;

        const adapter = this.activeWorkflows.get(workspaceId);
        if (adapter) {
            adapter.resume();
        }

        return {
            id: message.id,
            type: 'WORKFLOW_RESUMED',
            timestamp: Date.now(),
            payload: { workspaceId }
        };
    }

    /**
     * 停止工作流
     */
    async handleStopWorkflow(message) {
        const { workspaceId } = message.payload;

        const adapter = this.activeWorkflows.get(workspaceId);
        if (adapter) {
            adapter.stop();
            this.activeWorkflows.delete(workspaceId);
        }

        return {
            id: message.id,
            type: 'WORKFLOW_STOPPED',
            timestamp: Date.now(),
            payload: { workspaceId }
        };
    }

    /**
     * 获取日志
     */
    async handleGetLogs(message) {
        const { workspaceId } = message.payload;
        const workspacePath = join(process.cwd(), 'data', workspaceId);
        const logs = await this.readFiles(workspacePath, 'logs');

        return {
            id: message.id,
            type: 'LOGS_DATA',
            timestamp: Date.now(),
            payload: { workspaceId, logs }
        };
    }

    /**
     * 获取图表
     */
    async handleGetCharts(message) {
        const { workspaceId } = message.payload;
        const workspacePath = join(process.cwd(), 'data', workspaceId);
        const charts = await this.readFiles(workspacePath, 'charts');

        return {
            id: message.id,
            type: 'CHARTS_DATA',
            timestamp: Date.now(),
            payload: { workspaceId, charts }
        };
    }

    /**
     * 获取报告
     */
    async handleGetReports(message) {
        const { workspaceId } = message.payload;
        const workspacePath = join(process.cwd(), 'data', workspaceId);
        const reports = await this.readFiles(workspacePath, 'reports');

        return {
            id: message.id,
            type: 'REPORTS_DATA',
            timestamp: Date.now(),
            payload: { workspaceId, reports }
        };
    }

    /**
     * 获取报告内容
     */
    async handleGetReportContent(message) {
        const { workspaceId, reportName } = message.payload;
        const workspacePath = join(process.cwd(), 'data', workspaceId);
        const reportPath = join(workspacePath, 'reports', reportName);

        try {
            const content = await readFile(reportPath, 'utf-8');
            return {
                id: message.id,
                type: 'REPORT_CONTENT',
                timestamp: Date.now(),
                payload: { workspaceId, reportName, content }
            };
        } catch (error) {
            throw new Error(`Failed to read report: ${error.message}`);
        }
    }

    /**
     * 获取日志内容
     */
    async handleGetLogContent(message) {
        const { workspaceId, logName } = message.payload;
        const workspacePath = join(process.cwd(), 'data', workspaceId);
        const logPath = join(workspacePath, 'logs', logName);

        try {
            const content = await readFile(logPath, 'utf-8');
            return {
                id: message.id,
                type: 'LOG_CONTENT',
                timestamp: Date.now(),
                payload: { workspaceId, logName, content }
            };
        } catch (error) {
            throw new Error(`Failed to read log: ${error.message}`);
        }
    }

    /**
     * 获取工作流日志（JSON格式）- DB-only
     */
    async handleGetWorkflowLog(message) {
        const { workspaceId } = message.payload;

        try {
            const db = Database.getInstance().getDb();
            const rows = db.prepare(`
                SELECT entry_type, role, agent, content, entry_data, timestamp
                FROM workflow_logs WHERE workspace_id = ?
                ORDER BY timestamp ASC
            `).all(workspaceId);

            const logs = rows.map(row => {
                const entry = { type: row.entry_type, timestamp: row.timestamp };
                if (row.role) entry.role = row.role;
                if (row.agent) entry.agent = row.agent;
                if (row.content) entry.content = row.content;
                if (row.entry_data) {
                    try {
                        Object.assign(entry, JSON.parse(row.entry_data));
                    } catch { /* ignore */ }
                }
                return entry;
            });

            return {
                id: message.id,
                type: 'WORKFLOW_LOG_CONTENT',
                timestamp: Date.now(),
                payload: { workspaceId, logs }
            };
        } catch (error) {
            throw new Error(`Failed to read workflow log: ${error.message}`);
        }
    }

    // ============ 辅助方法 ============

    /**
     * 叠加内存中活跃 adapter 的实时状态到 workflowStatus
     * @private
     */
    _overlayActiveAdapterState(workspaceId, workflowStatus) {
        const adapter = this.activeWorkflows.get(workspaceId);
        if (!adapter) return workflowStatus;

        const adapterState = adapter.getStateRecovery();
        if (!workflowStatus) {
            workflowStatus = {};
        }

        // 内存中的 adapter 状态优先
        workflowStatus.isRunning = true;
        workflowStatus.awaitingUserInput = adapterState.isAwaitingInput;
        workflowStatus.stage = adapterState.stage;

        return workflowStatus;
    }

    /**
     * 列出所有工作区（优先从数据库查询）
     */
    async listWorkspaces() {
        // Try database first
        try {
            const db = Database.getInstance().getDb();
            const rows = db.prepare(`
                SELECT w.id, w.title, w.created_at, w.updated_at, w.status
                FROM workspaces w
                ORDER BY w.created_at DESC
            `).all();

            const workspaces = [];
            for (const row of rows) {
                const workspacePath = join(process.cwd(), 'data', row.id);
                const hasCharts = await this.hasFiles(workspacePath, 'charts');
                const hasReports = await this.hasFiles(workspacePath, 'reports');

                // Read scope from DB (scope_entries)
                let scope = null;
                try {
                    const scopeRows = db.prepare(
                        'SELECT scope_key, scope_value FROM scope_entries WHERE workspace_id = ?'
                    ).all(row.id);
                    if (scopeRows.length > 0) {
                        scope = {};
                        for (const sr of scopeRows) {
                            scope[sr.scope_key] = JSON.parse(sr.scope_value);
                        }
                    }
                } catch {
                    // ignore — scope simply absent
                }

                // Read workflow status from DB
                let workflowStatus = null;
                let isCompleted = false;
                try {
                    const lastLog = db.prepare(`
                        SELECT entry_type, entry_data FROM workflow_logs
                        WHERE workspace_id = ?
                        ORDER BY timestamp DESC LIMIT 1
                    `).get(row.id);
                    if (lastLog) {
                        isCompleted = lastLog.entry_type === 'workflow_completed';
                    }

                    const stageLog = db.prepare(`
                        SELECT entry_type, entry_data FROM workflow_logs
                        WHERE workspace_id = ? AND entry_type = 'stage_change'
                        ORDER BY timestamp DESC LIMIT 1
                    `).get(row.id);

                    workflowStatus = {
                        stage: stageLog ? JSON.parse(stageLog.entry_data || '{}').to : (row.status !== 'idle' ? row.status : 'idle'),
                        isRunning: row.status !== 'idle' && row.status !== 'completed',
                        awaitingUserInput: false,
                    };
                } catch {
                    // ignore — leave workflowStatus null
                }

                // hasLogs: workflow_logs 表里是否有任何条目
                let hasLogs = false;
                try {
                    const cnt = db.prepare(
                        'SELECT 1 FROM workflow_logs WHERE workspace_id = ? LIMIT 1'
                    ).get(row.id);
                    hasLogs = !!cnt;
                } catch { /* ignore */ }

                workspaces.push({
                    workspaceId: row.id,
                    createdAt: new Date(row.created_at).getTime(),
                    title: row.title || scope?.basic_infos?.user_questions?.[0] ||
                        scope?.basic_infos?.goal || row.id,
                    hasCharts,
                    hasReports,
                    hasLogs,
                    scope,
                    workflowStatus: this._overlayActiveAdapterState(row.id, workflowStatus),
                    isCompleted,
                });
            }
            return workspaces;
        } catch (error) {
            console.error('[MessageHandler] listWorkspaces DB query failed:', error.message);
            return [];
        }
    }

    /**
     * 获取工作区信息（DB-only：scope/工作流状态/日志均来自 SQLite）
     */
    async getWorkspaceInfo(workspacePath, workspaceId) {
        let stats;
        try {
            stats = await stat(workspacePath);
        } catch (error) {
            console.error(`[MessageHandler] Error getting workspace stats:`, error);
            return null;
        }

        const db = Database.getInstance().getDb();

        // ---- Scope (from scope_entries) ----
        let scope = null;
        try {
            const scopeRows = db.prepare(
                'SELECT scope_key, scope_value FROM scope_entries WHERE workspace_id = ?'
            ).all(workspaceId);
            if (scopeRows.length > 0) {
                scope = {};
                for (const sr of scopeRows) {
                    try { scope[sr.scope_key] = JSON.parse(sr.scope_value); }
                    catch { scope[sr.scope_key] = sr.scope_value; }
                }
            }
        } catch { /* ignore */ }

        // ---- Workflow status (from workflow_logs) ----
        let workflowStatus = null;
        let isCompleted = false;
        let hasLogs = false;
        try {
            const rows = db.prepare(`
                SELECT entry_type, entry_data, timestamp FROM workflow_logs
                WHERE workspace_id = ? ORDER BY timestamp ASC
            `).all(workspaceId);

            hasLogs = rows.length > 0;

            if (hasLogs) {
                let currentStage = 'idle';
                for (let i = rows.length - 1; i >= 0; i--) {
                    const log = rows[i];
                    if (log.entry_type === 'stage_change') {
                        try { currentStage = JSON.parse(log.entry_data || '{}').to || currentStage; } catch {}
                        break;
                    }
                    if (log.entry_type === 'plan_generated') { currentStage = 'planning'; break; }
                    if (log.entry_type === 'step_started')   { currentStage = 'executing'; break; }
                }

                const count = type => rows.filter(r => r.entry_type === type).length;
                const awaitingUserInput =
                    count('agent_question') > (count('user_input') + count('user_answer'));
                const isRunning =
                    count('step_started') > count('step_completed') || awaitingUserInput;

                workflowStatus = { stage: currentStage, isRunning, awaitingUserInput };

                const lastLog = rows[rows.length - 1];
                isCompleted = lastLog && lastLog.entry_type === 'workflow_completed';
            }
        } catch { /* ignore */ }

        const hasCharts = await this.hasFiles(workspacePath, 'charts');
        const hasReports = await this.hasFiles(workspacePath, 'reports');

        return {
            workspaceId,
            createdAt: stats.birthtime.getTime(),
            title: scope?.basic_infos?.user_questions?.[0] ||
                scope?.basic_infos?.goal ||
                workspaceId,
            hasCharts,
            hasReports,
            hasLogs,
            scope,
            workflowStatus,
            isCompleted
        };
    }

    /**
     * 读取目录下的所有文件（仅 charts/reports；logs 已迁移到 SQLite）
     */
    async readFiles(workspacePath, subDir) {
        const dirPath = join(workspacePath, subDir);

        try {
            const entries = await readdir(dirPath, { withFileTypes: true });
            const files = [];

            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = join(dirPath, entry.name);
                    const stats = await stat(filePath);

                    let content = null;
                    const isBinary = false;

                    if (entry.name.endsWith('.svg') || entry.name.endsWith('.md')) {
                        content = await readFile(filePath, 'utf-8');
                    }

                    files.push({
                        name: entry.name,
                        path: filePath,
                        size: stats.size,
                        createdAt: stats.birthtime.getTime(),
                        modifiedAt: stats.mtime.getTime(),
                        content,
                        isBinary
                    });
                }
            }

            return files.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * 检查目录是否有文件
     */
    async hasFiles(workspacePath, subDir) {
        const dirPath = join(workspacePath, subDir);
        try {
            const entries = await readdir(dirPath);
            return entries.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * 从 SQLite session_logs 表读取会话日志，模拟原 logs 目录的文件结构
     * 整段日志聚合为单个 "session.log" 虚拟条目，保持前端 API 形态兼容。
     */
    _readSessionLogs(workspaceId) {
        try {
            const db = Database.getInstance().getDb();
            const rows = db.prepare(`
                SELECT message, timestamp FROM session_logs
                WHERE workspace_id = ? ORDER BY timestamp ASC
            `).all(workspaceId);

            if (rows.length === 0) return [];

            const content = rows.map(r => r.message).join('\n');
            const firstTs = new Date(rows[0].timestamp).getTime();
            const lastTs = new Date(rows[rows.length - 1].timestamp).getTime();

            return [{
                name: 'session.log',
                path: `sqlite:session_logs?workspace=${workspaceId}`,
                size: Buffer.byteLength(content, 'utf-8'),
                createdAt: firstTs,
                modifiedAt: lastTs,
                content,
                isBinary: false,
            }];
        } catch (err) {
            console.warn('[MessageHandler] _readSessionLogs failed:', err.message);
            return [];
        }
    }
}