/**
 * AgentOrchestrator - Central coordinator for the blockchain analysis system
 * Manages the workflow between QuestionAgent, PlanAgent, and ExecuteAgent
 */

import { EventBus } from './events.js';
import { WorkflowStateMachine, WorkflowStage } from './state-machine.js';
import { QuestionAgent } from '../questionBot/agent.js';
import { PlanAgent } from '../planBot/agent.js';
import { ExecuteAgent } from '../executeBot/agent.js';

export { WorkflowStage } from './state-machine.js';

export class AgentOrchestrator {
    constructor(callLLM) {
        this.callLLM = callLLM;

        // Initialize agents
        this.questionAgent = new QuestionAgent(callLLM);
        this.planAgent = new PlanAgent(callLLM);
        this.executeAgent = new ExecuteAgent(callLLM);

        // Initialize supporting components
        this.eventBus = new EventBus();
        this.stateMachine = new WorkflowStateMachine(WorkflowStage.IDLE);

        // Workflow state
        this.workflowState = {
            stage: WorkflowStage.IDLE,
            scope: null,
            plan: null,
            currentStepIndex: 0,
            executionHistory: [],
            reviewResults: []
        };

        // Control flags
        this._paused = false;
        this._stopped = false;
        this._pausePromise = null;
        this._pauseResolve = null;

        // Bind event handlers
        this._setupStateMachineHooks();
    }

    /**
     * Setup state machine hooks to sync with workflow state
     */
    _setupStateMachineHooks() {
        this.stateMachine.onEnterState(WorkflowStage.IDLE, async () => {
            this.workflowState.stage = WorkflowStage.IDLE;
            this._emit('stage:changed', { from: this._lastStage, to: WorkflowStage.IDLE });
            this._lastStage = WorkflowStage.IDLE;
        });

        this.stateMachine.onEnterState(WorkflowStage.COLLECTING, async () => {
            this.workflowState.stage = WorkflowStage.COLLECTING;
            this._emit('stage:changed', { from: this._lastStage, to: WorkflowStage.COLLECTING });
            this._lastStage = WorkflowStage.COLLECTING;
        });

        this.stateMachine.onEnterState(WorkflowStage.PLANNING, async () => {
            this.workflowState.stage = WorkflowStage.PLANNING;
            this._emit('stage:changed', { from: this._lastStage, to: WorkflowStage.PLANNING });
            this._lastStage = WorkflowStage.PLANNING;
        });

        this.stateMachine.onEnterState(WorkflowStage.EXECUTING, async () => {
            this.workflowState.stage = WorkflowStage.EXECUTING;
            this._emit('stage:changed', { from: this._lastStage, to: WorkflowStage.EXECUTING });
            this._lastStage = WorkflowStage.EXECUTING;
        });

        this.stateMachine.onEnterState(WorkflowStage.REVIEWING, async () => {
            this.workflowState.stage = WorkflowStage.REVIEWING;
            this._emit('stage:changed', { from: this._lastStage, to: WorkflowStage.REVIEWING });
            this._lastStage = WorkflowStage.REVIEWING;
        });

        this.stateMachine.onEnterState(WorkflowStage.COMPLETED, async () => {
            this.workflowState.stage = WorkflowStage.COMPLETED;
            this._emit('stage:changed', { from: this._lastStage, to: WorkflowStage.COMPLETED });
            this._lastStage = WorkflowStage.COMPLETED;
        });

        this._lastStage = WorkflowStage.IDLE;
    }

    /**
     * Main entry point - starts the workflow
     * @param {string} [initialInput] - Optional initial user input
     * @returns {Promise<Object>} Workflow result
     */
    async run(initialInput = null) {
        try {
            // Initialize execute agent
            await this.executeAgent.initialize();

            // Start workflow
            this._emit('workflow:started', { initialInput });

            // Transition to collecting phase
            await this.stateMachine.transition(WorkflowStage.COLLECTING, {
                infos: this.questionAgent.getinfos()
            });

            // Phase 1: Collect requirements
            const infos = await this._collectRequirements(initialInput);
            this.workflowState.scope = { ...infos };

            // Phase 2: Create plan
            await this.stateMachine.transition(WorkflowStage.PLANNING, {
                infos
            });
            const plan = await this._createPlan(infos);
            this.workflowState.plan = plan;

            // Initialize scope from plan
            this.workflowState.scope = { ...this.workflowState.scope, ...plan.scope };

            // Phase 3: Execute with review
            const result = await this._executeWithReview();

            // Complete workflow
            await this.stateMachine.transition(WorkflowStage.COMPLETED, {});

            this._emit('workflow:completed', result);

            return result;

        } catch (error) {
            this._emit('workflow:error', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * Phase 1: Collect requirements using QuestionAgent
     * @private
     */
    async _collectRequirements(initialInput) {
        this._emit('collection:started', { initialInput });

        try {
            // Use the QuestionAgent's collectRequirements method
            const infos = await this.questionAgent.collectRequirements(initialInput, {
                onQuestion: async (question) => {
                    this._emit('question:asked', { question });
                    // In a real implementation, this would get user input
                    // For now, we'll throw an error indicating manual input is needed
                    throw new Error('Manual user input required. Question: ' + question);
                }
            });

            this._emit('collection:completed', { infos });
            return infos;

        } catch (error) {
            this._emit('collection:error', { error: error.message });
            throw error;
        }
    }

    /**
     * Phase 2: Create plan using PlanAgent
     * @private
     */
    async _createPlan(infos) {
        this._emit('planning:started', { infos });

        try {
            const plan = await this.planAgent.makePlan(infos);

            this._emit('planning:completed', { plan });
            return plan;

        } catch (error) {
            this._emit('planning:error', { error: error.message });
            throw error;
        }
    }

    /**
     * Phase 3: Execute plan with review loop
     * @private
     */
    async _executeWithReview() {
        this._emit('execution:started', {
            totalSteps: this.workflowState.plan.steps?.length || 0
        });

        const results = [];

        while (this.workflowState.currentStepIndex < this.workflowState.plan.steps.length) {
            // Check for stop signal
            if (this._stopped) {
                throw new Error('Workflow stopped by user');
            }

            // Wait if paused
            if (this._paused) {
                await this._waitForResume();
            }

            const stepIndex = this.workflowState.currentStepIndex;
            const step = this.workflowState.plan.steps[stepIndex];

            // Skip removed steps
            if (step.removed) {
                this.workflowState.currentStepIndex++;
                continue;
            }

            // Execute step
            await this.stateMachine.transition(WorkflowStage.EXECUTING, {
                stepIndex,
                step
            });

            this._emit('step:started', { stepIndex, step });

            const result = await this._executeSingleStep(step);
            results.push(result);

            this.workflowState.executionHistory.push({
                stepIndex,
                step,
                result,
                timestamp: Date.now()
            });

            this._emit('step:completed', { stepIndex, result });

            // Update scope with results
            if (result.scope) {
                this.workflowState.scope = { ...this.workflowState.scope, ...result.scope };
            }

            // Review step
            await this.stateMachine.transition(WorkflowStage.REVIEWING, {
                stepIndex,
                result
            });

            this._emit('review:started', { stepIndex });

            const reviewResult = await this._reviewStepExecution(step, result);

            this.workflowState.reviewResults.push({
                stepIndex,
                reviewResult,
                timestamp: Date.now()
            });

            this._emit('review:completed', {
                stepIndex,
                decision: reviewResult.decision,
                adjustments: reviewResult.adjustments
            });

            // Handle review decision
            const shouldContinue = await this._handleReviewDecision(reviewResult);

            if (!shouldContinue) {
                break;
            }

            // Move to next step
            this.workflowState.currentStepIndex++;
        }

        this._emit('execution:completed', { results });
        return { results, history: this.workflowState.executionHistory };
    }

    /**
     * Execute a single step using ExecuteAgent
     * @private
     */
    async _executeSingleStep(step) {
        try {
            const result = await this.executeAgent.executeStep(
                this.workflowState.scope,
                step
            );
            return result;
        } catch (error) {
            return {
                status: 'failure',
                reason: error.message,
                scope: this.workflowState.scope,
                history: []
            };
        }
    }

    /**
     * Review step execution using PlanAgent
     * @private
     */
    async _reviewStepExecution(step, executionResult) {
        try {
            const reviewResult = await this.planAgent.reviewStep(
                step,
                executionResult,
                this.workflowState.scope,
                this.workflowState.plan
            );
            return reviewResult;
        } catch (error) {
            // If review fails, default to continuing
            return {
                assessment: 'partial',
                findings: `Review failed: ${error.message}`,
                decision: 'CONTINUE',
                adjustments: [],
                reason: 'Review error, defaulting to continue',
                nextStepRecommendation: 'continue'
            };
        }
    }

    /**
     * Handle review decision and apply adjustments
     * @private
     */
    async _handleReviewDecision(reviewResult) {
        const { decision, adjustments } = reviewResult;

        switch (decision) {
            case 'CONTINUE':
                // Proceed to next step
                return true;

            case 'MODIFY_PLAN':
                // Apply adjustments and return to planning
                if (adjustments && adjustments.length > 0) {
                    this.workflowState.plan = this.planAgent.adjustPlan(
                        this.workflowState.plan,
                        adjustments
                    );
                }
                // Reset to planning phase to regenerate with modifications
                await this.stateMachine.transition(WorkflowStage.PLANNING, {
                    plan: this.workflowState.plan
                });
                return true;

            case 'ADD_STEPS':
                // Add new steps to the plan
                if (adjustments && adjustments.length > 0) {
                    this.workflowState.plan = this.planAgent.adjustPlan(
                        this.workflowState.plan,
                        adjustments
                    );
                }
                return true;

            case 'REMOVE_STEPS':
                // Remove steps from the plan
                if (adjustments && adjustments.length > 0) {
                    this.workflowState.plan = this.planAgent.adjustPlan(
                        this.workflowState.plan,
                        adjustments
                    );
                }
                return true;

            case 'REORDER':
                // Reorder remaining steps
                if (adjustments && adjustments.length > 0) {
                    const reorderAdjustment = adjustments.find(a => a.type === 'reorder');
                    if (reorderAdjustment && reorderAdjustment.newOrder) {
                        this.workflowState.plan = this.planAgent.reorderRemainingSteps(
                            this.workflowState.plan,
                            reorderAdjustment.newOrder
                        );
                    }
                }
                return true;

            case 'TERMINATE':
                // Terminate the workflow
                return false;

            default:
                // Unknown decision, default to continue
                return true;
        }
    }

    /**
     * Wait for resume signal when paused
     * @private
     */
    async _waitForResume() {
        if (!this._paused) return;

        this._pausePromise = new Promise((resolve) => {
            this._pauseResolve = resolve;
        });

        await this._pausePromise;
    }

    /**
     * Event subscription proxy to EventBus
     */
    on(event, handler) {
        return this.eventBus.on(event, handler);
    }

    /**
     * Event unsubscription proxy to EventBus
     */
    off(event, handler) {
        this.eventBus.off(event, handler);
    }

    /**
     * Emit event through EventBus
     * @private
     */
    _emit(event, data) {
        this.eventBus.emit(event, data);
    }

    /**
     * Get current workflow state
     * @returns {Object} Current workflow state
     */
    getState() {
        return {
            ...this.workflowState,
            stage: this.stateMachine.getState()
        };
    }

    /**
     * Pause the workflow
     */
    pause() {
        this._paused = true;
        this._emit('workflow:paused', {});
    }

    /**
     * Resume the workflow
     */
    resume() {
        this._paused = false;
        if (this._pauseResolve) {
            this._pauseResolve();
            this._pauseResolve = null;
            this._pausePromise = null;
        }
        this._emit('workflow:resumed', {});
    }

    /**
     * Stop the workflow
     */
    stop() {
        this._stopped = true;
        if (this._paused) {
            this.resume(); // Resume to allow stopping
        }
        this._emit('workflow:stopped', {});
    }
}
