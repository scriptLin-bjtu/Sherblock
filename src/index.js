import readline from "node:readline";
import { callLLM } from "./services/agent.js";
import { AgentOrchestrator } from "./agents/orchestrator/index.js";

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Initialize orchestrator with readline
const orchestrator = new AgentOrchestrator(callLLM, { readline: rl });

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
        console.log('🤖 区块链交易行为分析代理');
        console.log('请描述您想分析的区块链交易或地址：');

        const initialInput = await new Promise((resolve) => {
            rl.question('> ', resolve);
        });

        if (!initialInput || initialInput.trim() === '') {
            console.log('未提供输入，退出程序。');
            rl.close();
            process.exit(0);
        }

        // Start the orchestrator with the user input
        const result = await orchestrator.run(initialInput);
        console.log('\n最终结果:', result);

        rl.close();
    } catch (error) {
        console.error('Workflow failed:', error);
        rl.close();
        process.exit(1);
    }
}

// Run the main function
main();
