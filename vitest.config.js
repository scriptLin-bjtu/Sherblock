import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: [
            'src/utils/__tests__/**/*.test.js',
            'src/agents/orchestrator/__tests__/task-scheduler.test.js',
            'src/agents/orchestrator/__tests__/scope-coordinator.test.js',
            'src/agents/orchestrator/__tests__/dag-builder.test.js',
            'src/agents/orchestrator/__tests__/parallel-executor.test.js',
        ],
        exclude: [
            'src/agents/orchestrator/__tests__/state-machine.test.js',
            'src/agents/orchestrator/__tests__/integration.test.js',
            'src/agents/orchestrator/__tests__/orchestrator.test.js',
        ],
    },
});