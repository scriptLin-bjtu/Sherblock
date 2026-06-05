/**
 * Workflow Logger - 结构化工作流日志（纯 SQLite，无文件输出）
 */

import { LogRepository } from '../db/log-repository.js';

class WorkflowLogger {
    constructor() {
        this.workspaceId = null;
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        this.logRepo = null;
    }

    /**
     * 初始化工作流日志（DB-only）
     * @param {string} workspaceId - 工作区ID
     */
    async initialize(workspaceId) {
        this.workspaceId = workspaceId;
        this.logRepo = new LogRepository(workspaceId);

        // 在 DB session_logs 表中标记会话开始
        const startTime = new Date().toISOString();
        this._writeSessionLog(`[${startTime}] ===== Session Started: ${workspaceId} =====`);

        // 启动控制台输出拦截 → DB session_logs
        this._interceptConsole();

        this.originalConsole.log('[WorkflowLogger] Initialized: DB-only mode');
    }

    /**
     * 拦截 console 输出
     * @private
     */
    _interceptConsole() {
        const self = this;

        console.log = function(...args) {
            self.originalConsole.log.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
        };

        console.error = function(...args) {
            self.originalConsole.error.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
        };

        console.warn = function(...args) {
            self.originalConsole.warn.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
        };

        console.info = function(...args) {
            self.originalConsole.info.apply(console, args);
            self._writeSessionLog(`[${new Date().toISOString()}] [INFO] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
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
     * 写入 session.log（DB-only）
     * @private
     */
    _writeSessionLog(message) {
        if (!this.logRepo) return;
        try {
            this.logRepo.logToSession(message);
        } catch (err) {
            this.originalConsole.error('[WorkflowLogger] Failed to write session log:', err.message);
        }
    }

    /**
     * 手动写入 session.log
     */
    async logToSession(message) {
        this._writeSessionLog(`[${new Date().toISOString()}] ${message}`);
    }

    /**
     * 记录用户输入
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
     * 记录Agent问题
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
     */
    async logStepStart(stepIndex, stepName, stepId) {
        const entry = {
            type: 'step_started',
            stepIndex: stepIndex,
            stepName: stepName,
            step_id: stepId,
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤完成
     */
    async logStepComplete(stepIndex, stepName, result = null, stepId) {
        const entry = {
            type: 'step_completed',
            stepIndex: stepIndex,
            stepName: stepName,
            step_id: stepId,
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
     */
    async logPlanGenerated(plan) {
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

    _compressPlan(plan) {
        const summary = {
            scope: plan.scope || {},
            steps: [],
            nodes: {},
            edges: plan.edges || []
        };

        if (plan.steps && Array.isArray(plan.steps)) {
            summary.steps = plan.steps.map((step, index) => ({
                step_id: step.step_id || `step_${index + 1}`,
                goal: step.goal,
                skill: step.skill,
                success_criteria: step.success_criteria,
                depends_on: step.depends_on || []
            }));
        }

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

    _sanitizeParams(params) {
        if (!params) return {};
        const sanitized = { ...params };
        delete sanitized.apiKey;
        delete sanitized.API_KEY;
        return sanitized;
    }

    _summarizeResult(result) {
        if (!result) return { note: 'Empty result' };
        if (typeof result === 'string') {
            return { text: result.substring(0, 500), truncated: result.length > 500 };
        }
        if (typeof result === 'object') {
            const summary = {};
            for (const [key, value] of Object.entries(result)) {
                if (key === 'data' || key === 'result') {
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
     */
    async logStepThought(thought, stepIndex = null) {
        const entry = {
            type: 'step_thought',
            stepIndex: stepIndex,
            content: thought.substring(0, 1000),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录步骤动作
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
     */
    async logStepObservation(observation, stepIndex = null) {
        const entry = {
            type: 'step_observation',
            stepIndex: stepIndex,
            content: observation.substring(0, 1000),
            timestamp: new Date().toISOString()
        };
        await this._appendEntry(entry);
    }

    /**
     * 记录审查结果
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
     * 添加日志条目（DB-only）
     * @private
     */
    async _appendEntry(entry) {
        if (!this.logRepo) return;
        try {
            this.logRepo._insertEntry(
                entry.type,
                entry.role || null,
                entry.agent || null,
                entry.content || null,
                this._extractEntryData(entry)
            );
        } catch (error) {
            this.originalConsole.warn('[WorkflowLogger] DB write failed:', error.message);
        }
    }

    /**
     * Extract type-specific data from entry for DB storage
     * @private
     */
    _extractEntryData(entry) {
        const { type, role, agent, content, timestamp, ...rest } = entry;
        return Object.keys(rest).length > 0 ? rest : null;
    }

    /**
     * 获取当前所有日志
     */
    getLogs() {
        if (this.logRepo) {
            try {
                return this.logRepo.getLogs();
            } catch (err) {
                this.originalConsole.warn('[WorkflowLogger] getLogs failed:', err.message);
            }
        }
        return [];
    }

    /**
     * 获取底层 LogRepository
     */
    getLogRepository() {
        return this.logRepo;
    }

    /**
     * 关闭日志
     */
    async close() {
        const endTime = new Date().toISOString();
        this._writeSessionLog(`[${endTime}] ===== Session Ended =====`);
        this._restoreConsole();
        this.originalConsole.log('[WorkflowLogger] Closed');
    }
}

// 导出单例
export const workflowLogger = new WorkflowLogger();
export default workflowLogger;
