/**
 * Message Handler - 处理所有WebSocket消息
 */
import { v4 as uuidv4 } from 'uuid';
import { readdir, readFile, stat, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { workspaceManager } from '../utils/workspace-manager.js';
import { scopeManager } from '../utils/scope-manager.js';

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
            if (apiKeys.glm) process.env.GLM_API_KEY = apiKeys.glm;
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
            const [scope, charts, reports, logs] = await Promise.all([
                this.readScope(workspacePath),
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
                    scope,
                    charts,
                    reports,
                    logs
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
                        logs: []
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

        // 检查工作区是否存在
        try {
            await stat(workspacePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('Workspace not found');
            }
            throw error;
        }

        // 删除工作区目录
        await rm(workspacePath, { recursive: true, force: true });

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

        // 创建Orchestrator适配器
        const { OrchestratorAdapter } = await import('../adapters/orchestrator-adapter.js');
        const adapter = new OrchestratorAdapter(this.wsServer, workspaceId, clientId);

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

    // ============ 辅助方法 ============

    /**
     * 列出所有工作区
     */
    async listWorkspaces() {
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
            scope
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