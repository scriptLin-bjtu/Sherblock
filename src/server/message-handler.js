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

        const workspacePath = join(process.cwd(), 'data', workspaceId);

        try {
            const [workspaceInfo, charts, reports, logs] = await Promise.all([
                this.getWorkspaceInfo(workspacePath, workspaceId),
                this.readFiles(workspacePath, 'charts'),
                this.readFiles(workspacePath, 'reports'),
                this.readFiles(workspacePath, 'logs')
            ]);

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
                    workflowStatus: workspaceInfo?.workflowStatus
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
        adapter.run(input).catch(error => {
            console.error(`[MessageHandler] Analysis error:`, error);
            this.wsServer.send(clientId, 'ERROR', {
                workspaceId,
                error: error.message
            });
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
     * 获取工作流日志（JSON格式）- 优先从数据库查询
     */
    async handleGetWorkflowLog(message) {
        const { workspaceId } = message.payload;

        // Try database first
        try {
            const db = Database.getInstance().getDb();
            const rows = db.prepare(`
                SELECT entry_type, role, agent, content, entry_data, timestamp
                FROM workflow_logs WHERE workspace_id = ?
                ORDER BY timestamp ASC
            `).all(workspaceId);

            if (rows.length > 0) {
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
            }
        } catch (error) {
            console.warn('[MessageHandler] DB query for workflow log failed, falling back to file:', error.message);
        }

        // Fallback: file-based read
        const workspacePath = join(process.cwd(), 'data', workspaceId);
        const logPath = join(workspacePath, 'logs', 'workflow.json');

        try {
            const content = await readFile(logPath, 'utf-8');
            let logs;

            try {
                logs = JSON.parse(content);
            } catch (parseError) {
                console.warn('[MessageHandler] JSON parse failed, attempting repair:', parseError.message);
                logs = this._tryRepairJson(content);
            }

            return {
                id: message.id,
                type: 'WORKFLOW_LOG_CONTENT',
                timestamp: Date.now(),
                payload: { workspaceId, logs }
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    id: message.id,
                    type: 'WORKFLOW_LOG_CONTENT',
                    timestamp: Date.now(),
                    payload: { workspaceId, logs: [] }
                };
            }
            throw new Error(`Failed to read workflow log: ${error.message}`);
        }
    }

    /**
     * 尝试修复损坏的 JSON
     * @private
     */
    _tryRepairJson(content) {
        // 策略：找到最后一个闭合的 ] 作为数组结束
        // 从文件末尾开始搜索，定位到完整的 JSON 数组
        const lines = content.split('\n');
        let validJson = [];
        let current = [];
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;

        for (const line of lines) {
            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (char === '\\' && inString) {
                    escapeNext = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') braceCount++;
                    else if (char === '}') braceCount--;
                    else if (char === '[') bracketCount++;
                    else if (char === ']') bracketCount--;
                }
            }

            // 尝试解析当前累积的行
            try {
                const testJson = JSON.parse(current.join('\n'));
                if (Array.isArray(testJson)) {
                    validJson = testJson;
                }
            } catch {
                // 当前不完整，继续累积
            }

            current.push(line);
        }

        // 如果无法修复，返回空数组
        if (validJson.length === 0) {
            console.warn('[MessageHandler] Could not repair JSON, returning empty array');
            return [];
        }

        console.log(`[MessageHandler] Repaired JSON, recovered ${validJson.length} entries`);
        return validJson;
    }

    // ============ 辅助方法 ============

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

            if (rows.length > 0) {
                const workspaces = [];
                for (const row of rows) {
                    const workspacePath = join(process.cwd(), 'data', row.id);
                    const hasCharts = await this.hasFiles(workspacePath, 'charts');
                    const hasReports = await this.hasFiles(workspacePath, 'reports');

                    // Try to read scope from DB (scope_repository) or file
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
                        } else {
                            scope = await this.readScope(workspacePath);
                        }
                    } catch {
                        scope = await this.readScope(workspacePath);
                    }

                    // Read workflow status
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

                        // Determine stage from logs
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
                        // Fall back to file-based workflow status
                        try {
                            const workflowInfo = await this._getWorkflowStatusFromFile(workspacePath);
                            workflowStatus = workflowInfo.status;
                            isCompleted = workflowInfo.isCompleted;
                        } catch {
                            // Ignore
                        }
                    }

                    workspaces.push({
                        workspaceId: row.id,
                        createdAt: new Date(row.created_at).getTime(),
                        title: row.title || scope?.basic_infos?.user_questions?.[0] ||
                            scope?.basic_infos?.goal || row.id,
                        hasCharts,
                        hasReports,
                        hasLogs: true,
                        scope,
                        workflowStatus,
                        isCompleted,
                    });
                }
                return workspaces;
            }
        } catch (error) {
            console.warn('[MessageHandler] DB query failed, falling back to filesystem:', error.message);
        }

        // Fallback: filesystem scan (original logic)
        return this._listWorkspacesFromFilesystem();
    }

    /**
     * 从文件系统扫描工作区列表（fallback）
     */
    async _listWorkspacesFromFilesystem() {
        const dataDir = join(process.cwd(), 'data');

        try {
            const entries = await readdir(dataDir, { withFileTypes: true });
            const workspaces = [];

            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('workspace-')) {
                    const workspacePath = join(dataDir, entry.name);
                    const workspaceInfo = await this.getWorkspaceInfo(workspacePath, entry.name);

                    if (workspaceInfo) {
                        workspaces.push(workspaceInfo);
                    }
                }
            }

            return workspaces.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * 从文件读取工作流状态（fallback）
     */
    async _getWorkflowStatusFromFile(workspacePath) {
        let workflowStatus = null;
        let isCompleted = false;

        const workflowPath = join(workspacePath, 'logs', 'workflow.json');
        const workflowContent = await readFile(workflowPath, 'utf-8');
        const workflowLogs = JSON.parse(workflowContent);

        let currentStage = 'idle';
        for (let i = workflowLogs.length - 1; i >= 0; i--) {
            const log = workflowLogs[i];
            if (log.type === 'stage_change') { currentStage = log.to; break; }
            if (log.type === 'plan_generated') { currentStage = 'planning'; break; }
            if (log.type === 'step_started') { currentStage = 'executing'; break; }
        }

        const stepStarts = workflowLogs.filter(l => l.type === 'step_started');
        const stepCompletes = workflowLogs.filter(l => l.type === 'step_completed');
        const lastUserInput = workflowLogs.filter(l => l.type === 'user_input' || l.type === 'user_answer');
        const lastAgentQuestion = workflowLogs.filter(l => l.type === 'agent_question');

        const awaitingUserInput = lastAgentQuestion.length > lastUserInput.length;
        const isRunning = stepStarts.length > stepCompletes.length || awaitingUserInput;

        workflowStatus = { stage: currentStage, isRunning, awaitingUserInput };

        const lastLog = workflowLogs[workflowLogs.length - 1];
        isCompleted = lastLog && lastLog.type === 'workflow_completed';

        return { status: workflowStatus, isCompleted };
    }

    /**
     * 获取工作区信息
     */
    async getWorkspaceInfo(workspacePath, workspaceId) {
        let stats;
        try {
            stats = await stat(workspacePath);
        } catch (error) {
            console.error(`[MessageHandler] Error getting workspace stats:`, error);
            return null;
        }

        let scope = null;
        try {
            scope = await this.readScope(workspacePath);
        } catch (error) {
            // scope.json 可能不存在或读取失败，不影响工作区显示
        }

        // 读取 workflow.json 获取当前状态
        let workflowStatus = null;
        let isCompleted = false;
        try {
            const workflowPath = join(workspacePath, 'logs', 'workflow.json');
            const workflowContent = await readFile(workflowPath, 'utf-8');
            const workflowLogs = JSON.parse(workflowContent);

            // 从 workflow.json 推断当前状态
            // 查找最后一个 stage_change 或 step_started 等事件
            let currentStage = 'idle';
            let isRunning = false;
            let awaitingUserInput = false;

            for (let i = workflowLogs.length - 1; i >= 0; i--) {
                const log = workflowLogs[i];
                if (log.type === 'stage_change') {
                    currentStage = log.to;
                    break;
                }
                if (log.type === 'plan_generated') {
                    currentStage = 'planning';
                    break;
                }
                if (log.type === 'step_started') {
                    currentStage = 'executing';
                    break;
                }
            }

            // 检查是否有未完成的 user_answer（等待用户输入）
            const lastUserInput = workflowLogs.filter(l => l.type === 'user_input' || l.type === 'user_answer');
            const lastAgentQuestion = workflowLogs.filter(l => l.type === 'agent_question');

            if (lastAgentQuestion.length > lastUserInput.length) {
                awaitingUserInput = true;
            }

            // 检查最后一个 step_started 是否有对应的 step_completed
            const stepStarts = workflowLogs.filter(l => l.type === 'step_started');
            const stepCompletes = workflowLogs.filter(l => l.type === 'step_completed');

            // 如果有 step_started 但没有对应数量的 step_completed，说明还在运行
            isRunning = stepStarts.length > stepCompletes.length;

            // 如果有 agent_question 未回答，也在运行
            if (awaitingUserInput) {
                isRunning = true;
            }

            workflowStatus = {
                stage: currentStage,
                isRunning,
                awaitingUserInput
            };

            // 检查最后一条日志是否为 workflow_completed
            const lastLog = workflowLogs[workflowLogs.length - 1];
            isCompleted = lastLog && lastLog.type === 'workflow_completed';
        } catch (error) {
            // workflow.json 可能不存在，不影响工作区显示
        }

        const hasCharts = await this.hasFiles(workspacePath, 'charts');
        const hasReports = await this.hasFiles(workspacePath, 'reports');
        const hasLogs = await this.hasFiles(workspacePath, 'logs');

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
     * 读取scope.json
     */
    async readScope(workspacePath) {
        const scopePath = join(workspacePath, 'scope.json');
        try {
            const content = await readFile(scopePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * 读取目录下的所有文件
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
                    let isBinary = false;

                    // 根据文件类型决定是否读取内容
                    if (entry.name.endsWith('.svg')) {
                        content = await readFile(filePath, 'utf-8');
                        isBinary = false;
                    } else if (entry.name.endsWith('.md')) {
                        content = await readFile(filePath, 'utf-8');
                    } else if (entry.name.endsWith('.json')) {
                        content = await readFile(filePath, 'utf-8');
                    } else if (entry.name.endsWith('.log')) {
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
}