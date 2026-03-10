/**
 * WorkflowStateMachine - Manages workflow state transitions
 * Defines valid states and enforces transition rules
 */

export const WorkflowStage = {
    IDLE: 'idle',
    COLLECTING: 'collecting',
    PLANNING: 'planning',
    EXECUTING: 'executing',
    REVIEWING: 'reviewing',
    COMPLETED: 'completed'
};

// Define valid transitions from each state
const VALID_TRANSITIONS = {
    [WorkflowStage.IDLE]: [WorkflowStage.COLLECTING],
    [WorkflowStage.COLLECTING]: [WorkflowStage.PLANNING],
    [WorkflowStage.PLANNING]: [WorkflowStage.EXECUTING, WorkflowStage.COMPLETED],
    [WorkflowStage.EXECUTING]: [WorkflowStage.REVIEWING],
    [WorkflowStage.REVIEWING]: [WorkflowStage.EXECUTING, WorkflowStage.PLANNING, WorkflowStage.COMPLETED],
    [WorkflowStage.COMPLETED]: []
};

// Transition guards - preconditions for transitions
const TRANSITION_GUARDS = {
    [WorkflowStage.COLLECTING]: {
        to: WorkflowStage.PLANNING,
        check: (context) => {
            // Check that infos is complete
            const infos = context?.infos;
            if (!infos) return { valid: false, reason: 'No infos available' };
            if (infos.user_questions === null) return { valid: false, reason: 'user_questions is null' };
            if (infos.goal === null) return { valid: false, reason: 'goal is null' };
            if (infos.basic_infos === null) return { valid: false, reason: 'basic_infos is null' };
            return { valid: true };
        }
    },
    [WorkflowStage.PLANNING]: {
        to: WorkflowStage.EXECUTING,
        check: (context) => {
            // Check that plan and scope are available
            const plan = context?.plan;
            const scope = context?.scope;
            if (!plan) return { valid: false, reason: 'No plan available' };
            if (!Array.isArray(plan.steps)) return { valid: false, reason: 'Plan has no steps array' };
            if (!scope) return { valid: false, reason: 'No scope available' };
            return { valid: true };
        }
    },
    [WorkflowStage.EXECUTING]: {
        to: WorkflowStage.REVIEWING,
        check: (context) => {
            // Check that step result exists
            const stepResult = context?.stepResult;
            if (!stepResult) return { valid: false, reason: 'No step result available' };
            return { valid: true };
        }
    },
    [WorkflowStage.REVIEWING]: {
        to: WorkflowStage.COMPLETED,
        check: (context) => {
            // Check that all steps are completed
            const plan = context?.plan;
            const currentStepIndex = context?.currentStepIndex ?? 0;
            if (!plan || !Array.isArray(plan.steps)) return { valid: false, reason: 'No valid plan' };
            const remainingSteps = plan.steps.slice(currentStepIndex).filter(s => !s.removed);
            if (remainingSteps.length > 0) {
                return { valid: false, reason: `${remainingSteps.length} steps remaining` };
            }
            return { valid: true };
        }
    }
};

export class WorkflowStateMachine {
    constructor(initialState = WorkflowStage.IDLE) {
        this.state = initialState;
        this.hooks = {
            beforeTransition: [],
            afterTransition: [],
            onEnterState: new Map(),
            onLeaveState: new Map()
        };
    }

    /**
     * Get current state
     * @returns {string} Current state
     */
    getState() {
        return this.state;
    }

    /**
     * Check if transition to a state is valid from current state
     * @param {string} to - Target state
     * @returns {boolean} Whether transition is valid
     */
    canTransition(to) {
        const validTransitions = VALID_TRANSITIONS[this.state] || [];
        return validTransitions.includes(to);
    }

    /**
     * Get list of valid transitions from current state
     * @returns {string[]} Valid next states
     */
    getValidTransitions() {
        return VALID_TRANSITIONS[this.state] || [];
    }

    /**
     * Perform state transition with guards and hooks
     * @param {string} to - Target state
     * @param {Object} context - Context for guards and hooks
     * @returns {Promise<boolean>} Whether transition succeeded
     */
    async transition(to, context = {}) {
        const from = this.state;

        // Check if transition is valid
        if (!this.canTransition(to)) {
            throw new Error(`Invalid transition from ${from} to ${to}`);
        }

        // Check transition guards
        for (const guard of Object.values(TRANSITION_GUARDS)) {
            if (guard.to === to && this.state === from) {
                const result = guard.check(context);
                if (!result.valid) {
                    throw new Error(`Transition guard failed: ${result.reason}`);
                }
            }
        }

        // Execute before transition hooks
        for (const hook of this.hooks.beforeTransition) {
            const result = await hook(from, to, context);
            if (result === false) {
                return false; // Hook cancelled transition
            }
        }

        // Execute leave state hook
        const leaveHook = this.hooks.onLeaveState.get(from);
        if (leaveHook) {
            await leaveHook(from, context);
        }

        // Perform the transition
        this.state = to;

        // Execute enter state hook
        const enterHook = this.hooks.onEnterState.get(to);
        if (enterHook) {
            await enterHook(to, context);
        }

        // Execute after transition hooks
        for (const hook of this.hooks.afterTransition) {
            await hook(from, to, context);
        }

        return true;
    }

    /**
     * Register a hook to run before transitions
     * @param {Function} handler - Hook function(from, to, context)
     */
    beforeTransition(handler) {
        this.hooks.beforeTransition.push(handler);
    }

    /**
     * Register a hook to run after transitions
     * @param {Function} handler - Hook function(from, to, context)
     */
    afterTransition(handler) {
        this.hooks.afterTransition.push(handler);
    }

    /**
     * Register a hook to run when entering a state
     * @param {string} state - State to hook
     * @param {Function} handler - Hook function(state, context)
     */
    onEnterState(state, handler) {
        this.hooks.onEnterState.set(state, handler);
    }

    /**
     * Register a hook to run when leaving a state
     * @param {string} state - State to hook
     * @param {Function} handler - Hook function(state, context)
     */
    onLeaveState(state, handler) {
        this.hooks.onLeaveState.set(state, handler);
    }

    /**
     * Reset state machine to initial state
     */
    reset() {
        this.state = WorkflowStage.IDLE;
        this.hooks = {
            beforeTransition: [],
            afterTransition: [],
            onEnterState: new Map(),
            onLeaveState: new Map()
        };
    }
}
