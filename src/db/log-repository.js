import { Database } from './database.js';

export class LogRepository {
    constructor(workspaceId) {
        this.workspaceId = workspaceId;
        this.db = null;
    }

    _ensureDb() {
        if (!this.db) {
            this.db = Database.getInstance().getDb();
        }
        return this.db;
    }

    setWorkspaceId(workspaceId) {
        this.workspaceId = workspaceId;
    }

    /**
     * Ensure workspace exists before inserting (FK constraint)
     */
    _ensureWorkspace(db) {
        db.prepare(`
            INSERT OR IGNORE INTO workspaces (id, title, status)
            VALUES (?, ?, 'idle')
        `).run(this.workspaceId, this.workspaceId);
    }

    /**
     * Insert a single log entry
     */
    _insertEntry(entryType, role, agent, content, entryData = null) {
        const db = this._ensureDb();
        this._ensureWorkspace(db);

        db.prepare(`
            INSERT INTO workflow_logs (workspace_id, entry_type, role, agent, content, entry_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            this.workspaceId,
            entryType,
            role || null,
            agent || null,
            content || null,
            entryData ? JSON.stringify(entryData) : null
        );

        this._logChange('log_appended', JSON.stringify({ entryType }));
    }

    // === Typed log methods (matching WorkflowLogger API) ===

    logUserInput(content) {
        this._insertEntry('user_input', 'user', null, content);
    }

    logQuestion(question) {
        this._insertEntry('agent_question', 'agent', 'QuestionAgent', question);
    }

    logUserAnswer(answer) {
        this._insertEntry('user_answer', 'user', null, answer);
    }

    logAgentMessage(agent, message, stage = null) {
        this._insertEntry('agent_message', 'agent', agent, message, stage ? { stage } : null);
    }

    logStageChange(fromStage, toStage) {
        this._insertEntry('stage_change', null, null, `${fromStage} -> ${toStage}`, { from: fromStage, to: toStage });
    }

    logStepStart(stepIndex, stepName, stepId) {
        this._insertEntry('step_started', null, null, stepName, { stepIndex, stepName, step_id: stepId });
    }

    logStepComplete(stepIndex, stepName, result = null, stepId) {
        this._insertEntry('step_completed', null, null, stepName, {
            stepIndex,
            stepName,
            step_id: stepId,
            result: result ? { success: result.success !== false, hasScope: !!result.scope } : null,
        });
    }

    logError(error, context = null) {
        this._insertEntry('error', null, null, String(error), { error: String(error), context });
    }

    logWorkflowComplete(result = null) {
        this._insertEntry('workflow_completed', null, null, 'Workflow completed', {
            result: result ? { summary: 'Analysis completed' } : null,
        });
    }

    logPlanGenerated(plan) {
        const summary = this._compressPlan(plan);
        this._insertEntry('plan_generated', null, null, 'Plan generated', {
            scope: summary.scope,
            steps: summary.steps,
            nodes: summary.nodes,
            edges: summary.edges,
        });
    }

    logSkillCall(skillName, params) {
        this._insertEntry('skill_call', null, null, skillName, {
            skill: skillName,
            params: this._sanitizeParams(params),
        });
    }

    logSkillResult(skillName, result) {
        this._insertEntry('skill_result', null, null, skillName, {
            skill: skillName,
            success: result?.success !== false,
            summary: this._summarizeResult(result),
        });
    }

    logScopeUpdate(updates, stepId = null) {
        this._insertEntry('scope_update', null, null, 'Scope updated', {
            stepId,
            updates: this._summarizeResult(updates),
        });
    }

    logStepThought(thought, stepIndex = null) {
        this._insertEntry('step_thought', null, null, thought.substring(0, 1000), { stepIndex });
    }

    logStepAction(action, details, stepIndex = null) {
        this._insertEntry('step_action', null, null, action, {
            stepIndex,
            action,
            details: this._summarizeResult(details),
        });
    }

    logStepObservation(observation, stepIndex = null) {
        this._insertEntry('step_observation', null, null, observation.substring(0, 1000), { stepIndex });
    }

    logReviewResult(reviewResult, stepIndex = null) {
        this._insertEntry('review_result', null, null, 'Review result', {
            stepIndex,
            assessment: reviewResult?.assessment,
            decision: reviewResult?.decision,
            reason: reviewResult?.reason?.substring(0, 500),
        });
    }

    // === Session logs ===

    logToSession(message) {
        const db = this._ensureDb();
        db.prepare(`
            INSERT INTO session_logs (workspace_id, level, message)
            VALUES (?, 'LOG', ?)
        `).run(this.workspaceId, message);
    }

    // === Query methods ===

    /**
     * Get all logs for this workspace
     */
    getLogs(options = {}) {
        const db = this._ensureDb();
        let query = 'SELECT * FROM workflow_logs WHERE workspace_id = ?';
        const params = [this.workspaceId];

        if (options.type) {
            query += ' AND entry_type = ?';
            params.push(options.type);
        }

        query += ' ORDER BY timestamp ASC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        const rows = db.prepare(query).all(...params);
        return rows.map(row => this._rowToEntry(row));
    }

    /**
     * Get logs by type
     */
    getLogsByType(type) {
        return this.getLogs({ type });
    }

    /**
     * Get latest workflow stage
     */
    getLatestStage() {
        const db = this._ensureDb();
        const row = db.prepare(`
            SELECT entry_data FROM workflow_logs
            WHERE workspace_id = ? AND entry_type = 'stage_change'
            ORDER BY timestamp DESC LIMIT 1
        `).get(this.workspaceId);

        if (row?.entry_data) {
            return JSON.parse(row.entry_data);
        }
        return null;
    }

    /**
     * Get workflow status (replaces 50-line inference logic in MessageHandler)
     */
    getWorkflowStatus() {
        const db = this._ensureDb();

        const lastLog = db.prepare(`
            SELECT entry_type, entry_data FROM workflow_logs
            WHERE workspace_id = ?
            ORDER BY timestamp DESC LIMIT 1
        `).get(this.workspaceId);

        if (!lastLog) {
            return { stage: 'idle', isRunning: false, awaitingUserInput: false };
        }

        const isCompleted = lastLog.entry_type === 'workflow_completed';
        const isRunning = !isCompleted;

        // Determine current stage
        let stage = 'idle';
        if (lastLog.entry_type === 'stage_change' && lastLog.entry_data) {
            stage = JSON.parse(lastLog.entry_data).to;
        } else if (lastLog.entry_type === 'plan_generated') {
            stage = 'planning';
        } else if (lastLog.entry_type === 'step_started') {
            stage = 'executing';
        }

        // Check for awaiting user input
        const questionCount = db.prepare(
            "SELECT COUNT(*) as cnt FROM workflow_logs WHERE workspace_id = ? AND entry_type = 'agent_question'"
        ).get(this.workspaceId).cnt;
        const answerCount = db.prepare(
            "SELECT COUNT(*) as cnt FROM workflow_logs WHERE workspace_id = ? AND entry_type = 'user_answer'"
        ).get(this.workspaceId).cnt;

        return {
            stage,
            isRunning: isRunning && !isCompleted,
            awaitingUserInput: questionCount > answerCount,
        };
    }

    // === Helper methods ===

    _rowToEntry(row) {
        const entry = {
            type: row.entry_type,
            timestamp: row.timestamp,
        };

        if (row.role) entry.role = row.role;
        if (row.agent) entry.agent = row.agent;
        if (row.content) entry.content = row.content;

        // Merge entry_data into the entry (flattened for backward compat)
        if (row.entry_data) {
            try {
                const data = JSON.parse(row.entry_data);
                Object.assign(entry, data);
            } catch {
                // Ignore parse errors
            }
        }

        return entry;
    }

    _compressPlan(plan) {
        const summary = { scope: plan.scope || {}, steps: [], nodes: {}, edges: plan.edges || [] };

        if (plan.steps && Array.isArray(plan.steps)) {
            summary.steps = plan.steps.map((step, index) => ({
                step_id: step.step_id || `step_${index + 1}`,
                goal: step.goal,
                skill: step.skill,
                success_criteria: step.success_criteria,
                depends_on: step.depends_on || [],
            }));
        }

        if (plan.nodes && typeof plan.nodes === 'object') {
            for (const [key, node] of Object.entries(plan.nodes)) {
                summary.nodes[key] = {
                    goal: node.goal,
                    skill: node.skill,
                    success_criteria: node.success_criteria,
                    depends_on: node.depends_on || [],
                };
            }
        }

        return summary;
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

    _logChange(changeType, changeDetail = null) {
        try {
            const db = this._ensureDb();
            db.prepare(`
                INSERT INTO change_log (workspace_id, change_type, change_detail)
                VALUES (?, ?, ?)
            `).run(this.workspaceId, changeType, changeDetail);
        } catch {
            // Don't fail log operations if change logging fails
        }
    }
}
