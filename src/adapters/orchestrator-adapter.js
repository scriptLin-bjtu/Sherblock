/**
 * Orchestrator Adapter - 将Agent事件转换为WebSocket消息
 */
import { AgentOrchestrator, WorkflowStage } from '../agents/orchestrator/index.js';
import { callLLM } from '../services/agent.js';
import { workspaceManager } from '../utils/workspace-manager.js';
import { scopeManager } from '../utils/scope-manager.js';
import { conversationLogger } from '../utils/conversation-logger.js';

export class OrchestratorAdapter {
    constructor(wsServer, workspaceId, clientId) {
        this.wsServer = wsServer;
        this.workspaceId = workspaceId;
        this.clientId = clientId;
        this.orchestrator = null;
        this.pendingQuestion = null;
        this.skillRegistry = null;
        this.conversationLogger = conversationLogger;

        // 保存初始化 Promise，以便在 run() 中等待
        this._initPromise = this.setupOrchestrator();
    }

    /**
     * 等待初始化完成
     */
    async _waitForInit() {
        await this._initPromise;
    }

    /**
     * 设置Orchestrator
     */
    async setupOrchestrator() {
        // 初始化执行Agent以获取skill registry
        const { ExecuteAgentV2 } = await import('../agents/executeBot/agent-v2.js');
        const executeAgent = new ExecuteAgentV2(callLLM, scopeManager);
        await executeAgent.initialize();
        this.skillRegistry = executeAgent.skillRegistry;

        // 创建Orchestrator
        this.orchestrator = new AgentOrchestrator(callLLM, {
            readline: null // 不使用stdin，由WebSocket处理
        });

        // 设置事件监听
        this.setupEventListeners();
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        const emit = (event, data) => {
            this.send(event, data);
        };

        // 工作流事件
        this.orchestrator.on('workflow:started', (data) => {
            emit('WORKFLOW_STARTED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('workflow:completed', (data) => {
            emit('ANALYSIS_COMPLETED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('workflow:error', (data) => {
            emit('ANALYSIS_ERROR', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('workflow:paused', () => {
            emit('WORKFLOW_PAUSED', { workspaceId: this.workspaceId });
        });

        this.orchestrator.on('workflow:resumed', () => {
            emit('WORKFLOW_RESUMED', { workspaceId: this.workspaceId });
        });

        this.orchestrator.on('workflow:stopped', () => {
            emit('WORKFLOW_STOPPED', { workspaceId: this.workspaceId });
        });

        // 阶段变更事件
        this.orchestrator.on('stage:changed', (data) => {
            emit('STAGE_CHANGED', {
                workspaceId: this.workspaceId,
                stage: data.to,
                from: data.from,
                to: data.to
            });
        });

        // 收集阶段事件
        this.orchestrator.on('collection:started', (data) => {
            emit('COLLECTION_STARTED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('collection:completed', (data) => {
            emit('COLLECTION_COMPLETED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('collection:error', (data) => {
            emit('COLLECTION_ERROR', { workspaceId: this.workspaceId, ...data });
        });

        // Agent消息 - 发送到前端显示
        this.orchestrator.on('agent:message', (data) => {
            emit('AGENT_MESSAGE', {
                workspaceId: this.workspaceId,
                agent: data.agent || 'Agent',
                message: data.message,
                stage: data.stage
            });
        });

        // 规划阶段事件
        this.orchestrator.on('planning:started', (data) => {
            emit('PLANNING_STARTED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('planning:completed', (data) => {
            emit('PLANNING_COMPLETED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('planning:error', (data) => {
            emit('PLANNING_ERROR', { workspaceId: this.workspaceId, ...data });
        });

        // 执行阶段事件
        this.orchestrator.on('execution:started', (data) => {
            emit('EXECUTION_STARTED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('execution:completed', (data) => {
            emit('EXECUTION_COMPLETED', { workspaceId: this.workspaceId, ...data });
        });

        // 步骤事件
        this.orchestrator.on('step:started', (data) => {
            emit('STEP_STARTED', {
                workspaceId: this.workspaceId,
                stepIndex: data.stepIndex,
                step: data.step
            });
        });

        this.orchestrator.on('step:completed', (data) => {
            emit('STEP_COMPLETED', {
                workspaceId: this.workspaceId,
                stepIndex: data.stepIndex,
                result: data.result
            });

            // 如果有scope更新，发送SCOPE_UPDATED
            if (data.result?.scope) {
                emit('SCOPE_UPDATED', {
                    workspaceId: this.workspaceId,
                    scope: data.result.scope
                });
            }
        });

        // 审查事件
        this.orchestrator.on('review:started', (data) => {
            emit('REVIEW_STARTED', { workspaceId: this.workspaceId, ...data });
        });

        this.orchestrator.on('review:completed', (data) => {
            emit('REVIEW_COMPLETED', {
                workspaceId: this.workspaceId,
                stepIndex: data.stepIndex,
                decision: data.decision,
                adjustments: data.adjustments
            });
        });

        // 问题事件 - 关键：需要用户输入
        this.orchestrator.on('question:asked', async (data) => {
            // 记录 QuestionAgent 的问题
            this.conversationLogger.logAgentMessage('QuestionAgent', data.question, 'COLLECTING').catch(err => {
                console.error('[OrchestratorAdapter] Failed to log question:', err);
            });

            emit('AGENT_MESSAGE', {
                workspaceId: this.workspaceId,
                agent: 'QuestionAgent',
                message: data.question,
                requiresInput: true
            });

            // 等待用户输入
            await this.waitForUserInput();
        });

        // 阶段变更 - 记录阶段变化
        this.orchestrator.on('stage:changed', (data) => {
            this.conversationLogger.logStageChange(data.to).catch(err => {
                console.error('[OrchestratorAdapter] Failed to log stage change:', err);
            });
        });
    }

    /**
     * 等待用户输入
     */
    waitForUserInput() {
        return new Promise((resolve) => {
            this.pendingQuestion = resolve;
        });
    }

    /**
     * 处理用户输入
     */
    handleUserInput(input) {
        // 记录用户输入（非阻塞）
        this.conversationLogger.logUserMessage(input).catch(err => {
            console.error('[OrchestratorAdapter] Failed to log user input:', err);
        });

        // 触发 adapter 层面的 Promise resolve
        if (this.pendingQuestion) {
            this.pendingQuestion(input);
            this.pendingQuestion = null;
        }

        // 同时触发 orchestrator 层面的 Promise resolve
        if (this.orchestrator && this.orchestrator.handleUserInput) {
            this.orchestrator.handleUserInput(input);
        }
    }

    /**
     * 发送消息到客户端
     */
    send(type, payload) {
        this.wsServer.send(this.clientId, type, payload);
    }

    /**
     * 运行分析
     */
    async run(initialInput) {
        try {
            // 等待初始化完成
            await this._waitForInit();

            // 使用已有的workspace（由message-handler传入的workspaceId）
            await workspaceManager.initialize(this.workspaceId);
            await scopeManager.initialize();

            // 初始化对话日志
            await this.conversationLogger.initialize(this.workspaceId);
            await this.conversationLogger.logUserMessage(initialInput);

            // 运行orchestrator
            const result = await this.orchestrator.run(initialInput);

            // 发送完成消息
            this.send('ANALYSIS_COMPLETED', {
                workspaceId: this.workspaceId,
                result
            });

            return result;
        } catch (error) {
            console.error('[OrchestratorAdapter] Error:', error);
            this.send('ERROR', {
                workspaceId: this.workspaceId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            // 关闭对话日志
            await this.conversationLogger.close();
        }
    }

    /**
     * 暂停工作流
     */
    pause() {
        if (this.orchestrator) {
            this.orchestrator.pause();
        }
    }

    /**
     * 恢复工作流
     */
    resume() {
        if (this.orchestrator) {
            this.orchestrator.resume();
        }
    }

    /**
     * 停止工作流
     */
    stop() {
        if (this.orchestrator) {
            this.orchestrator.stop();
        }
    }

    /**
     * 获取当前状态
     */
    getState() {
        if (this.orchestrator) {
            return this.orchestrator.getState();
        }
        return null;
    }
}

export default OrchestratorAdapter;