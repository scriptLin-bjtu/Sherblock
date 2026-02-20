import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator, WorkflowStage } from '../index.js';

// Mock the LLM service
const mockCallLLM = vi.fn();

describe('AgentOrchestrator', () => {
    let orchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new AgentOrchestrator(mockCallLLM);
    });

    describe('Construction', () => {
        it('should initialize with correct default state', () => {
            const state = orchestrator.getState();
            expect(state.stage).toBe(WorkflowStage.IDLE);
            expect(state.scope).toBeNull();
            expect(state.plan).toBeNull();
            expect(state.currentStepIndex).toBe(0);
            expect(state.executionHistory).toEqual([]);
            expect(state.reviewResults).toEqual([]);
        });

        it('should initialize all three agents', () => {
            expect(orchestrator.questionAgent).toBeDefined();
            expect(orchestrator.planAgent).toBeDefined();
            expect(orchestrator.executeAgent).toBeDefined();
        });

        it('should initialize event bus and state machine', () => {
            expect(orchestrator.eventBus).toBeDefined();
            expect(orchestrator.stateMachine).toBeDefined();
        });
    });

    describe('Event System', () => {
        it('should allow event subscription via on()', () => {
            const handler = vi.fn();
            orchestrator.on('test:event', handler);
            orchestrator._emit('test:event', { data: 'test' });
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should allow event unsubscription via off()', () => {
            const handler = vi.fn();
            orchestrator.on('test:event', handler);
            orchestrator.off('test:event', handler);
            orchestrator._emit('test:event', { data: 'test' });
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Lifecycle Control', () => {
        it('should support pause operation', () => {
            orchestrator.pause();
            const state = orchestrator.getState();
            expect(orchestrator._paused).toBe(true);
        });

        it('should support resume operation', () => {
            orchestrator.pause();
            orchestrator.resume();
            expect(orchestrator._paused).toBe(false);
        });

        it('should support stop operation', () => {
            orchestrator.stop();
            expect(orchestrator._stopped).toBe(true);
        });
    });

    describe('State Transitions', () => {
        it('should emit stage:changed event on transition', async () => {
            const handler = vi.fn();
            orchestrator.on('stage:changed', handler);

            // Manually trigger a transition through the state machine
            await orchestrator.stateMachine.transition(WorkflowStage.COLLECTING, {
                infos: { test: 'data' }
            });

            expect(handler).toHaveBeenCalledWith({
                from: WorkflowStage.IDLE,
                to: WorkflowStage.COLLECTING
            });
        });
    });
});
