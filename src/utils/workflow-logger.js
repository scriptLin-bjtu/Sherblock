/**
 * Workflow Logger - 结构化JSON工作流日志
 * 记录用户与Agent的完整对话流程
 */

import { open, readFile, stat } from 'fs/promises';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { workspaceManager } from './workspace-manager.js';

class WorkflowLogger {
    constructor() {
        this.fileHandle = null;
        this.workspaceId = null;
        this.logFilePath = null;
        this.sessionLogPath = null;
        this.buffer = [];
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        this.writeLock = null; // 文件写入锁
    }

    /**
     * 获取写入锁
     * @private
     */
    async _acquireLock() {
        while (this.writeLock) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        this.writeLock = true;
    }

    /**
     * 释放写入锁
     * @private
     */
    _releaseLock() {
        this.writeLock = null;
    }

    /**
     * 初始化工作流日志
     * @param {string} workspaceId - 工作区ID
     */
    async initialize(workspaceId) {
        this.workspaceId = workspaceId;

        // 获取日志目录路径
        const logsPath = workspaceManager.getLogsPath();

        // 工作流日志文件名固定为 workflow.json
        this.logFilePath = join(logsPath, 'workflow.json');

        // session.log 用于记录控制台输出
        this.sessionLogPath = join(logsPath, 'session.log');

        // 如果文件已存在，读取现有内容；否则创建新文件
        try {
            const stats = await stat(this.logFilePath);
            if (stats.size > 0) {
                const content = await readFile(this.logFilePath, 'utf-8');
                this.buffer = JSON.parse(content);
            } else {
                this.buffer = [];
            }
        } catch (e) {
            // 文件不存在，创建新的空数组
            this.buffer = [];
        }

        // 初始化 session.log，写入开始标记
        const startTime = new Date().toISOString();
        await this._writeSessionLog(`[${startTime}] ===== Session Started: ${workspaceId} =====\n`);

        // 启动控制台输出拦截
        this._interceptConsole();

        this.originalConsole.log(`[WorkflowLogger] Initialized: ${this.logFilePath}`);
    }

    /**
     * 拦截 console 输出，写入 session.log
     * @private
     */
    _interceptConsole() {
        const self = this;

        // 拦截 console.log
        console.log = function(...args) {
            self.originalConsole.log.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`);
        };

        // 拦截 console.error
        console.error = function(...args) {
            self.originalConsole.error.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`);
        };

        // 拦截 console.warn
        console.warn = function(...args) {
            self.originalConsole.warn.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`);
        };

        // 拦截 console.info
        console.info = function(...args) {
            self.originalConsole.info.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [INFO] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`);
        };
    }

    /**
     * 恢复原始 console
     * @private
     */
    _restoreConsole() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
    }

    /**
     * 写入 session.log
     * @private
     */
    async _writeSessionLog(message) {
        if (!this.sessionLogPath) return;
        try {
            const handle = await open(this.sessionLogPath, 'a');
            await handle.writeFile(message, 'utf-8');
            await handle.close();
        } catch (err) {
            this.originalConsole.error('[WorkflowLogger] Failed to write session.log:', err);
        }
    }

    /**
     * 手动写入 session.log（用于非 console 输出）
     * @param {string} message - 消息内容
     */
    async logToSession(message) {
        await this._writeSessionLog(`[${new Date().toISOString()}] ${message}\n`);
    }

    /**
     * 记录用户输入
     * @param {string} content - 用户输入内容
     */
    async logUserInput(content) {
        const entry = {
            type: 'user_input',
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录Agent问题（QuestionAgent）
     * @param {string} question - Agent问题
     */
    async logQuestion(question) {
        const entry = {
            type: 'agent_question',
            role: 'agent',
            agent: 'QuestionAgent',
            content: question,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录用户回答
     * @param {string} answer - 用户回答
     */
    async logUserAnswer(answer) {
        const entry = {
            type: 'user_answer',
            role: 'user',
            content: answer,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录Agent消息
     * @param {string} agent - Agent名称
     * @param {string} message - 消息内容
     * @param {string} stage - 阶段
     */
    async logAgentMessage(agent, message, stage = null) {
        const entry = {
            type: 'agent_message',
            role: 'agent',
            agent: agent,
            content: message,
            stage: stage,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录阶段变更
     * @param {string} toStage - 目标阶段
     * @param {string} fromStage - 起始阶段（可选）
     */
    async logStageChange(fromStage, toStage) {
        const entry = {
            type: 'stage_change',
            from: fromStage,
            to: toStage,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤开始
     * @param {number} stepIndex - 步骤索引
     * @param {string} stepName - 步骤名称
     */
    async logStepStart(stepIndex, stepName) {
        const entry = {
            type: 'step_started',
            stepIndex: stepIndex,
            stepName: stepName,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤完成
     * @param {number} stepIndex - 步骤索引
     * @param {string} stepName - 步骤名称
     * @param {object} result - 步骤结果摘要
     */
    async logStepComplete(stepIndex, stepName, result = null) {
        const entry = {
            type: 'step_completed',
            stepIndex: stepIndex,
            stepName: stepName,
            result: result ? {
                success: result.success !== false,
                hasScope: !!result.scope
            } : null,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录错误
     * @param {string} error - 错误信息
     * @param {string} context - 错误上下文
     */
    async logError(error, context = null) {
        const entry = {
            type: 'error',
            error: error,
            context: context,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录工作流完成
     * @param {object} result - 完成结果
     */
    async logWorkflowComplete(result = null) {
        const entry = {
            type: 'workflow_completed',
            result: result ? { summary: 'Analysis completed' } : null,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录计划生成
     * @param {object} plan - PlanAgent 生成的计划
     */
    async logPlanGenerated(plan) {
        // 压缩计划数据，只保留关键信息用于显示
        const planSummary = this._compressPlan(plan);
        const entry = {
            type: 'plan_generated',
            scope: planSummary.scope,
            steps: planSummary.steps,
            nodes: planSummary.nodes,
            edges: planSummary.edges,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 压缩计划数据用于日志记录
     * @private
     */
    _compressPlan(plan) {
        const summary = {
            scope: plan.scope || {},
            steps: [],
            nodes: {},
            edges: plan.edges || []
        };

        // 处理 steps 数组（串行模式）
        if (plan.steps && Array.isArray(plan.steps)) {
            summary.steps = plan.steps.map((step, index) => ({
                step_id: step.step_id || `step_${index + 1}`,
                goal: step.goal,
                skill: step.skill,
                success_criteria: step.success_criteria,
                depends_on: step.depends_on || []
            }));
        }

        // 处理 nodes（图模式）
        if (plan.nodes && typeof plan.nodes === 'object') {
            for (const [key, node] of Object.entries(plan.nodes)) {
                summary.nodes[key] = {
                    goal: node.goal,
                    skill: node.skill,
                    success_criteria: node.success_criteria,
                    depends_on: node.depends_on || []
                };
            }
        }

        return summary;
    }

    /**
     * 记录技能调用
     * @param {string} skillName - 技能名称
     * @param {object} params - 技能参数
     */
    async logSkillCall(skillName, params) {
        const entry = {
            type: 'skill_call',
            skill: skillName,
            params: this._sanitizeParams(params),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录技能执行结果
     * @param {string} skillName - 技能名称
     * @param {object} result - 执行结果
     */
    async logSkillResult(skillName, result) {
        const entry = {
            type: 'skill_result',
            skill: skillName,
            success: result?.success !== false,
            summary: this._summarizeResult(result),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 清理参数，移除敏感信息
     * @private
     */
    _sanitizeParams(params) {
        if (!params) return {};
        const sanitized = { ...params };
        // 移除可能的敏感字段
        delete sanitized.apiKey;
        delete sanitized.API_KEY;
        return sanitized;
    }

    /**
     * 生成结果摘要
     * @private
     */
    _summarizeResult(result) {
        if (!result) return { note: 'Empty result' };

        // 如果是字符串，取前500字符
        if (typeof result === 'string') {
            return { text: result.substring(0, 500), truncated: result.length > 500 };
        }

        // 如果是对象，只保留关键字段
        if (typeof result === 'object') {
            const summary = {};
            for (const [key, value] of Object.entries(result)) {
                if (key === 'data' || key === 'result') {
                    // 特殊处理 data/result 字段
                    if (typeof value === 'string') {
                        summary[key] = value.substring(0, 300);
                        if (value.length > 300) summary[key] += '...';
                    } else if (typeof value === 'object') {
                        summary[key] = '[Object]';
                    } else {
                        summary[key] = value;
                    }
                } else if (typeof value !== 'function') {
                    summary[key] = value;
                }
            }
            return summary;
        }

        return { value: String(result) };
    }

    /**
     * 记录 Scope 更新
     * @param {object} updates - 更新的内容
     * @param {string} stepId - 步骤ID
     */
    async logScopeUpdate(updates, stepId = null) {
        const entry = {
            type: 'scope_update',
            stepId: stepId,
            updates: this._summarizeResult(updates),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤思考
     * @param {string} thought - 思考内容
     * @param {number} stepIndex - 步骤索引
     */
    async logStepThought(thought, stepIndex = null) {
        const entry = {
            type: 'step_thought',
            stepIndex: stepIndex,
            content: thought.substring(0, 1000), // 限制长度
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤动作
     * @param {string} action - 动作类型
     * @param {object} details - 动作详情
     * @param {number} stepIndex - 步骤索引
     */
    async logStepAction(action, details, stepIndex = null) {
        const entry = {
            type: 'step_action',
            stepIndex: stepIndex,
            action: action,
            details: this._summarizeResult(details),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤观察结果
     * @param {string} observation - 观察结果
     * @param {number} stepIndex - 步骤索引
     */
    async logStepObservation(observation, stepIndex = null) {
        const entry = {
            type: 'step_observation',
            stepIndex: stepIndex,
            content: observation.substring(0, 1000), // 限制长度
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录审查结果
     * @param {object} reviewResult - 审查结果
     * @param {number} stepIndex - 步骤索引
     */
    async logReviewResult(reviewResult, stepIndex = null) {
        const entry = {
            type: 'review_result',
            stepIndex: stepIndex,
            assessment: reviewResult?.assessment,
            decision: reviewResult?.decision,
            reason: reviewResult?.reason?.substring(0, 500),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 添加日志条目
     * @private
     */
    async _appendEntry(entry) {
        this.buffer.push(entry);

        // 实时刷新到文件
        await this._flush();
    }

    /**
     * 刷新缓冲到文件
     * @private
     */
    async _flush() {
        await this._acquireLock();
        try {
            const content = JSON.stringify(this.buffer, null, 2);
            await writeFile(this.logFilePath, content, 'utf-8');
        } catch (err) {
            console.error('[WorkflowLogger] Failed to write:', err);
        } finally {
            this._releaseLock();
        }
    }

    /**
     * 获取当前所有日志
     */
    getLogs() {
        return [...this.buffer];
    }

    /**
     * 获取日志文件路径
     */
    getLogFilePath() {
        return this.logFilePath;
    }

    /**
     * 获取 session.log 文件路径
     */
    getSessionLogPath() {
        return this.sessionLogPath;
    }

    /**
     * 关闭日志
     */
    async close() {
        // 写入结束标记
        const endTime = new Date().toISOString();
        await this._writeSessionLog(`[${endTime}] ===== Session Ended =====\n`);

        // 恢复原始 console
        this._restoreConsole();

        // 确保最后的数据写入
        await this._flush();
        this.originalConsole.log('[WorkflowLogger] Closed');
    }
}

// 导出单例
export const workflowLogger = new WorkflowLogger();
export default workflowLogger;