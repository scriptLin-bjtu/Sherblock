import readline from "node:readline";
import { callLLM } from "./services/agent.js";
import { AgentOrchestrator } from "./agents/orchestrator/index.js";
import { logger } from "./utils/logger.js";
import { workspaceManager } from "./utils/workspace-manager.js";

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
    useParallelExecution: false,
    maxParallelTasks: 3,
    continueOnFailure: false,
};

// 解析参数
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
        case '--parallel':
        case '-p':
            options.useParallelExecution = true;
            break;
        case '--max-parallel':
        case '-m':
            const val = parseInt(args[i + 1], 10);
            if (!isNaN(val) && val > 0) {
                options.maxParallelTasks = val;
                i++;
            }
            break;
        case '--continue-on-failure':
        case '-c':
            options.continueOnFailure = true;
            break;
        case '--help':
        case '-h':
            console.log(`
区块链交易行为分析代理

用法: node src/index.js [选项]

选项:
  -p, --parallel              启用并行执行模式
  -m, --max-parallel <数量>   最大并行任务数 (默认: 3)
  -c, --continue-on-failure   失败后继续执行
  -h, --help                  显示帮助信息

示例:
  node src/index.js
  node src/index.js --parallel
  node src/index.js -p -m 5
  node src/index.js --parallel --max-parallel 5 --continue-on-failure
            `);
            process.exit(0);
            break;
    }
}

if (options.useParallelExecution) {
    console.log('[Config] Parallel execution enabled');
    console.log(`[Config] Max parallel tasks: ${options.maxParallelTasks}`);
    if (options.continueOnFailure) {
        console.log('[Config] Continue on failure: enabled');
    }
}

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Initialize orchestrator with readline and parallel execution options
const orchestrator = new AgentOrchestrator(callLLM, {
    readline: rl,
    useParallelExecution: options.useParallelExecution,
    maxParallelTasks: options.maxParallelTasks,
    continueOnFailure: options.continueOnFailure,
});

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
        // Initialize workspace first (needed for logger)
        await workspaceManager.initialize();

        // Initialize logger (now uses workspace logs directory)
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

        // Start orchestrator with user input
        const result = await orchestrator.run(initialInput);

        console.log('\n===== 分析完成 =====');
        console.log('执行结果:', result);

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
