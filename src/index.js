import readline from "node:readline";
import { callLLM } from "./services/agent.js";
import { AgentOrchestrator } from "./agents/orchestrator/index.js";
import { logger } from "./utils/logger.js";

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

orchestrator.on('report:generation:started', () => {
    console.log('[Orchestrator] Report generation started');
});

orchestrator.on('report:generation:completed', (data) => {
    console.log('[Orchestrator] Report generation completed');
});

orchestrator.on('report:generation:error', (data) => {
    console.error('[Orchestrator] Report generation error:', data.error);
});

orchestrator.on('workflow:error', (data) => {
    console.error('[Orchestrator] Workflow error:', data.error);
});

// Main entry point
async function main() {
    try {
        // Initialize logger
        const logFile = await logger.initialize();
        if (logFile) {
            console.log(`📝 Logging to: ${logFile}`);
        }

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
        const { result, report } = await orchestrator.run(initialInput);

        console.log('\n===== 分析完成 =====');
        console.log('执行结果:', result);

        // Display the report
        if (report) {
            console.log('\n===== 分析报告 =====\n');
            console.log(report);
            console.log('\n===== 报告结束 =====\n');

            // Save report to file
            const fs = await import('node:fs/promises');
            const path = await import('node:path');

            // Ensure data directory exists
            const dataDir = path.join(process.cwd(), 'data');
            try {
                await fs.mkdir(dataDir, { recursive: true });
            } catch (err) {
                // Directory may already exist
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportPath = path.join(dataDir, `report-${timestamp}.md`);

            try {
                await fs.writeFile(reportPath, report, 'utf-8');
                console.log(`\n✅ 报告已保存到: ${reportPath}`);
            } catch (err) {
                console.error(`\n❌ 保存报告失败: ${err.message}`);
            }
        }

        rl.close();
        await logger.close();
    } catch (error) {
        console.error('Workflow failed:', error);
        rl.close();
        await logger.close();
        process.exit(1);
    }
}

// Run the main function
main();
