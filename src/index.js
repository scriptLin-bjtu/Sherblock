import { callLLM } from "./services/agent.js";
import { AgentOrchestrator } from "./agents/orchestrator/index.js";

// Initialize orchestrator
const orchestrator = new AgentOrchestrator(callLLM);

// Setup event listeners for monitoring
orchestrator.on('workflow:started', (data) => {
    console.log('[Orchestrator] Workflow started');
});

orchestrator.on('stage:changed', (data) => {
    console.log(`[Orchestrator] Stage changed: ${data.from} -> ${data.to}`);
});

orchestrator.on('step:started', (data) => {
    console.log(`[Orchestrator] Step ${data.stepIndex} started`);
});

orchestrator.on('step:completed', (data) => {
    console.log(`[Orchestrator] Step ${data.stepIndex} completed`);
});

orchestrator.on('review:started', (data) => {
    console.log(`[Orchestrator] Review started for step ${data.stepIndex}`);
});

orchestrator.on('review:completed', (data) => {
    console.log(`[Orchestrator] Review completed: ${data.decision}`);
});

orchestrator.on('workflow:completed', (data) => {
    console.log('[Orchestrator] Workflow completed');
});

orchestrator.on('workflow:error', (data) => {
    console.error('[Orchestrator] Workflow error:', data.error);
});

// Main entry point
async function main() {
    try {
        // Start the orchestrator with optional initial input
        const result = await orchestrator.run();
        console.log('Final result:', result);
    } catch (error) {
        console.error('Workflow failed:', error);
        process.exit(1);
    }
}

// Run the main function
main();
