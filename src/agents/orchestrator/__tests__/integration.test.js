import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator, WorkflowStage } from '../index.js';

// Mock LLM responses
const createMockCallLLM = (responses) => {
    let callCount = 0;
    return vi.fn().mockImplementation(() => {
        const response = responses[callCount % responses.length];
        callCount++;
        return Promise.resolve(response);
    });
};

describe('Orchestrator Integration Tests', () => {
    describe('Normal Workflow', () => {
        it('should complete a simple end-to-end workflow', async () => {
            // Setup mock responses for the workflow
            const mockResponses = [
                // QuestionAgent responses - FINISH when complete
                { action_type: 'FINISH', changes: { user_questions: 'Test question', goal: { analysis_type: 'test' }, basic_infos: { chain: 'ethereum' } } },
                // PlanAgent responses
                { plan: { scope: {}, steps: [{ goal: 'Test step', success_criteria: ['done'] }] } },
                // ExecuteAgent responses
                { action_type: 'FINISH', result: { status: 'success', summary: 'Step completed' } },
                // PlanAgent review responses
                { assessment: 'success', decision: 'CONTINUE', adjustments: [] }
            ];

            const mockCallLLM = createMockCallLLM(mockResponses);
            const orchestrator = new AgentOrchestrator(mockCallLLM);

            // Track events
            const events = [];
            orchestrator.on('workflow:started', () => events.push('started'));
            orchestrator.on('stage:changed', (data) => events.push(`stage:${data.to}`));
            orchestrator.on('workflow:completed', () => events.push('completed'));

            // Run the workflow
            const result = await orchestrator.run();

            // Verify the workflow completed
            expect(result).toBeDefined();
            expect(events).toContain('started');
            expect(events).toContain('completed');
        }, 30000);
    });

    describe('Plan Adjustments', () => {
        it('should handle plan modifications during review', async () => {
            const mockCallLLM = vi.fn();

            // Setup sequential responses
            mockCallLLM
                // QuestionAgent
                .mockResolvedValueOnce({
                    action_type: 'FINISH',
                    changes: {
                        user_questions: 'Test',
                        goal: { analysis_type: 'test' },
                        basic_infos: { chain: 'ethereum' }
                    }
                })
                // PlanAgent - makePlan
                .mockResolvedValueOnce({
                    plan: {
                        scope: {},
                        steps: [
                            { goal: 'Step 1', success_criteria: ['done'] },
                            { goal: 'Step 2', success_criteria: ['done'] }
                        ]
                    }
                })
                // ExecuteAgent - step 1
                .mockResolvedValueOnce({
                    action_type: 'FINISH',
                    result: { status: 'success', summary: 'Step 1 done' }
                })
                // PlanAgent - review with MODIFY_PLAN
                .mockResolvedValueOnce({
                    assessment: 'partial',
                    decision: 'MODIFY_PLAN',
                    adjustments: [
                        { type: 'add', stepIndex: 1, step: { goal: 'New step', success_criteria: ['done'] } }
                    ]
                });

            const orchestrator = new AgentOrchestrator(mockCallLLM);

            // Run partial workflow
            await orchestrator.stateMachine.transition(WorkflowStage.COLLECTING, {
                infos: { test: 'data' }
            });

            const plan = await orchestrator._createPlan({ test: 'data' });
            expect(plan.plan.steps).toHaveLength(2);

            // Execute one step
            const stepResult = await orchestrator._executeSingleStep(plan.plan.steps[0]);
            expect(stepResult.status).toBe('success');
        }, 30000);
    });

    describe('Error Recovery', () => {
        it('should handle execution failures gracefully', async () => {
            const mockCallLLM = vi.fn();

            mockCallLLM
                // QuestionAgent
                .mockResolvedValueOnce({
                    action_type: 'FINISH',
                    changes: {
                        user_questions: 'Test',
                        goal: { analysis_type: 'test' },
                        basic_infos: { chain: 'ethereum' }
                    }
                })
                // PlanAgent
                .mockResolvedValueOnce({
                    plan: {
                        scope: {},
                        steps: [{ goal: 'Test step', success_criteria: ['done'] }]
                    }
                })
                // ExecuteAgent - throws error
                .mockRejectedValueOnce(new Error('Execution failed'));

            const orchestrator = new AgentOrchestrator(mockCallLLM);

            // Setup workflow state
            await orchestrator.stateMachine.transition(WorkflowStage.COLLECTING, {
                infos: { test: 'data' }
            });

            const plan = await orchestrator._createPlan({ test: 'data' });
            orchestrator.workflowState.plan = plan;

            // Execute step that will fail
            const result = await orchestrator._executeSingleStep(plan.plan.steps[0]);

            expect(result.status).toBe('failure');
            expect(result.reason).toBe('Execution failed');
        }, 30000);
    });
});
