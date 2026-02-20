import { WorkflowStateMachine, WorkflowStage } from '../state-machine.js';

// Simple test runner
function describe(name, fn) {
    console.log(`\n📦 ${name}`);
    fn();
}

function it(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
    } catch (error) {
        console.log(`  ❌ ${name}`);
        console.error(`     ${error.message}`);
        process.exitCode = 1;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toBeDefined() {
            if (actual === undefined) {
                throw new Error(`Expected value to be defined`);
            }
        },
        toEqual(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toContain(expected) {
            if (!actual.includes(expected)) {
                throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
            }
        },
        toHaveLength(expected) {
            if (actual.length !== expected) {
                throw new Error(`Expected length ${expected}, got ${actual.length}`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected value to be truthy`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected value to be falsy`);
            }
        }
    };
}

// Tests
describe('WorkflowStateMachine', () => {
    let stateMachine;

    beforeEach(() => {
        stateMachine = new WorkflowStateMachine();
    });

    describe('State Definitions', () => {
        it('should define all workflow stages', () => {
            expect(WorkflowStage.IDLE).toBe('idle');
            expect(WorkflowStage.COLLECTING).toBe('collecting');
            expect(WorkflowStage.PLANNING).toBe('planning');
            expect(WorkflowStage.EXECUTING).toBe('executing');
            expect(WorkflowStage.REVIEWING).toBe('reviewing');
            expect(WorkflowStage.COMPLETED).toBe('completed');
        });
    });

    describe('State Initialization', () => {
        it('should start in idle state', () => {
            expect(stateMachine.getState()).toBe(WorkflowStage.IDLE);
        });
    });

    describe('Valid Transitions', () => {
        it('should allow valid transitions from idle', () => {
            expect(stateMachine.canTransition(WorkflowStage.COLLECTING)).toBeTruthy();
            expect(stateMachine.canTransition(WorkflowStage.PLANNING)).toBeFalsy();
        });
    });

    describe('Transition Execution', () => {
        it('should perform valid transition', async () => {
            const result = await stateMachine.transition(WorkflowStage.COLLECTING);
            expect(result).toBeTruthy();
            expect(stateMachine.getState()).toBe(WorkflowStage.COLLECTING);
        });

        it('should throw on invalid transition', async () => {
            try {
                await stateMachine.transition(WorkflowStage.EXECUTING);
                throw new Error('Should have thrown');
            } catch (error) {
                expect(error.message).toContain('Invalid transition');
            }
        });
    });

    describe('Hooks', () => {
        it('should call beforeTransition hook', async () => {
            let called = false;
            stateMachine.beforeTransition((from, to, context) => {
                called = true;
            });

            await stateMachine.transition(WorkflowStage.COLLECTING);

            expect(called).toBeTruthy();
        });

        it('should call afterTransition hook', async () => {
            let called = false;
            stateMachine.afterTransition(() => {
                called = true;
            });

            await stateMachine.transition(WorkflowStage.COLLECTING);

            expect(called).toBeTruthy();
        });

        it('should cancel transition if beforeTransition returns false', async () => {
            stateMachine.beforeTransition(() => false);

            const result = await stateMachine.transition(WorkflowStage.COLLECTING);

            expect(result).toBeFalsy();
            expect(stateMachine.getState()).toBe(WorkflowStage.IDLE);
        });
    });

    describe('Reset', () => {
        it('should reset to idle state', async () => {
            await stateMachine.transition(WorkflowStage.COLLECTING);
            stateMachine.reset();

            expect(stateMachine.getState()).toBe(WorkflowStage.IDLE);
        });

        it('should clear hooks on reset', async () => {
            let called = false;
            stateMachine.beforeTransition(() => {
                called = true;
            });
            stateMachine.reset();

            await stateMachine.transition(WorkflowStage.COLLECTING);

            expect(called).toBeFalsy();
        });
    });
});

console.log('\n🧪 Running State Machine Tests...\n');
