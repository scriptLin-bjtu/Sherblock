/**
 * 测试脚本：测试图表生成和报告生成技能
 *
 * 模拟plan的最后两步，直接测试图表生成和报告生成功能
 * 使用之前workspace的scope数据进行测试
 */

import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { workspaceManager } from './src/utils/workspace-manager.js';

// 加载技能
import funnelChartSkill from './src/agents/executeBot/skills/chart/create-funnel-chart/index.js';
import radarChartSkill from './src/agents/executeBot/skills/chart/create-radar-chart/index.js';
import reportSkill from './src/agents/executeBot/skills/report/generate-report/index.js';

// 从之前的workspace加载scope数据
const OLD_SCOPE_PATH = './data/workspace-20260322-233440-f9cea8/scope.json';

/**
 * 模拟执行上下文
 */
function createMockContext(workspacePath) {
    return {
        apiKey: process.env.DEEPSEEK_API_KEY,
        chainId: 1,
        workspacePath: workspacePath,
        logger: {
            info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
            error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
            warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
        }
    };
}

/**
 * 模拟plan对象
 */
function createMockPlan() {
    return {
        steps: [
            { goal: '获取交易基础详情', rationale: '了解交易的发送者、接收者、金额、Gas消耗和区块信息' },
            { goal: '获取交易收据与事件日志', rationale: '识别交易中发生的所有代币转账事件和内部交易' },
            { goal: '提取并汇总资金流动', rationale: '构建结构化的资金流序列' },
            { goal: '推断行为模式', rationale: '综合判断交易的核心行为类别和特征' },
            { goal: '准备可视化数据', rationale: '转换为图表可用的格式' },
            { goal: '生成资金流图', rationale: '直观展示资金流动路径' },
            { goal: '生成地址交互网络图', rationale: '展示地址节点及其交互关系' },
            { goal: '编译分析报告', rationale: '整合文本分析和可视化图表' }
        ]
    };
}

/**
 * 模拟执行历史
 */
function createMockExecutionHistory() {
    return [
        {
            stepIndex: 0,
            timestamp: Date.now(),
            result: {
                status: 'completed',
                history: []
            }
        },
        {
            stepIndex: 1,
            timestamp: Date.now() + 1000,
            result: {
                status: 'completed',
                history: []
            }
        }
    ];
}

/**
 * 运行测试
 */
async function runTest() {
    console.log('='.repeat(60));
    console.log('测试图表生成和报告生成技能');
    console.log('='.repeat(60));

    try {
        // 1. 初始化workspace
        console.log('\n[步骤 1] 初始化workspace...');
        await workspaceManager.initialize();
        const workspacePath = workspaceManager.getWorkspacePath();
        const chartsPath = workspaceManager.getChartsPath();
        const reportsPath = workspaceManager.getReportsPath();
        console.log(`  Workspace ID: ${workspaceManager.getWorkspaceId()}`);
        console.log(`  Workspace Path: ${workspacePath}`);
        console.log(`  Charts Path: ${chartsPath}`);
        console.log(`  Reports Path: ${reportsPath}`);

        // 2. 加载之前的scope数据
        console.log('\n[步骤 2] 加载之前的scope数据...');
        const scopeData = await readFile(OLD_SCOPE_PATH, 'utf-8');
        const scope = JSON.parse(scopeData);
        console.log(`  已加载 scope，包含 ${Object.keys(scope).length} 个字段`);

        // 3. 测试funnel chart生成
        console.log('\n[步骤 3] 生成资金流漏斗图...');
        const context = createMockContext(workspacePath);

        const funnelResult = await funnelChartSkill.execute(
            {
                title: 'Fund Flow Analysis for Transaction 0x0cf24e76d9482704cfedd89d061e2e686aac31d8e6f8bd81adfe73ab34355f3e',
                description: 'Visualization of ETH transfer and WETH wrapping process showing 56,018.05001 ETH moving from sender to receiver, then being wrapped to WETH',
                data: [
                    { name: 'ETH Transfer', value: 100 },
                    { name: 'WETH Deposit', value: 100 }
                ],
                filename: join(chartsPath, 'fund-flow-chart.png'),
                width: 800,
                height: 600
            },
            context
        );
        const funnelFilePath = funnelResult.filePath || funnelResult.filepath;
        console.log(`  ${funnelResult.status === 'success' ? '✓' : '✗'} Funnel chart: ${funnelResult.status}`);
        if (funnelResult.status === 'success') {
            console.log(`    文件路径: ${funnelFilePath}`);
        } else {
            console.log(`    错误: ${funnelResult.error}`);
        }

        // 4. 测试radar chart生成
        console.log('\n[步骤 4] 生成地址交互雷达图...');
        const radarResult = await radarChartSkill.execute(
            {
                title: 'Address Interaction Network Analysis',
                indicators: [
                    { name: '交易频率', max: 100 },
                    { name: '资金规模', max: 100 },
                    { name: '合约交互', max: 100 },
                    { name: '代币操作', max: 100 },
                    { name: '活跃程度', max: 100 }
                ],
                series: [
                    {
                        name: '发送者',
                        data: [80, 90, 60, 50, 85]
                    },
                    {
                        name: '接收者',
                        data: [70, 95, 95, 90, 80]
                    }
                ],
                filename: join(chartsPath, 'address-network-chart.png'),
                width: 800,
                height: 600
            },
            context
        );
        const radarFilePath = radarResult.filePath || radarResult.filepath;
        console.log(`  ${radarResult.status === 'success' ? '✓' : '✗'} Radar chart: ${radarResult.status}`);
        if (radarResult.status === 'success') {
            console.log(`    文件路径: ${radarFilePath}`);
        } else {
            console.log(`    错误: ${radarResult.error}`);
        }

        // 5. 更新scope中的visualization_data
        console.log('\n[步骤 5] 更新scope中的图表信息...');
        scope.visualization_data = {
            fund_flow_chart: {
                file_path: funnelFilePath || 'charts/fund-flow-chart.png',
                format: 'png',
                width: 800,
                height: 600,
                chart_type: 'funnel',
                title: 'Fund Flow Analysis',
                description: 'Visualization of ETH transfer and WETH wrapping process',
                generated_at: Date.now()
            },
            address_network_chart: {
                file_path: radarFilePath || 'charts/address-network-chart.png',
                format: 'png',
                width: 800,
                height: 600,
                chart_type: 'radar',
                title: 'Address Interaction Network Analysis',
                description: 'Radar chart showing interaction strengths between addresses',
                generated_at: Date.now()
            }
        };

        // 保存更新后的scope
        const scopePath = join(workspacePath, 'scope.json');
        await writeFile(scopePath, JSON.stringify(scope, null, 2), 'utf-8');
        console.log(`  ✓ 已保存 scope 到 ${scopePath}`);

        // 6. 生成报告
        console.log('\n[步骤 6] 生成分析报告...');
        const plan = createMockPlan();
        const executionHistory = createMockExecutionHistory();

        const reportResult = await reportSkill.execute(
            {
                scope: scope,
                plan: plan,
                executionHistory: executionHistory
            },
            context
        );

        console.log(`  ✓ 报告生成完成`);
        console.log(`    报告长度: ${reportResult.length} 字符`);

        // 7. 保存报告
        const reportFilename = `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
        const reportPath = join(reportsPath, reportFilename);
        await writeFile(reportPath, reportResult, 'utf-8');
        console.log(`  ✓ 报告已保存到: ${reportPath}`);

        // 8. 检查报告中是否包含图片引用
        console.log('\n[步骤 7] 验证报告中的图片引用...');
        const hasFunnelImage = reportResult.includes('fund-flow-chart.png');
        const hasRadarImage = reportResult.includes('address-network-chart.png');
        const hasImageMarkdown = reportResult.includes('![');
        const hasVisualizationSection = reportResult.includes('### 资金流可视化') || reportResult.includes('### 行为画像可视化');

        console.log(`  ${hasFunnelImage ? '✓' : '✗'} 包含 funnel chart 引用`);
        console.log(`  ${hasRadarImage ? '✓' : '✗'} 包含 radar chart 引用`);
        console.log(`  ${hasImageMarkdown ? '✓' : '✗'} 包含图片语法`);
        console.log(`  ${hasVisualizationSection ? '✓' : '✗'} 包含可视化章节`);

        // 显示报告的前几行
        console.log('\n[报告预览] 前500字符:');
        console.log(reportResult.substring(0, 500) + '...');

        console.log('\n' + '='.repeat(60));
        console.log('测试完成！');
        console.log('='.repeat(60));
        console.log(`\nWorkspace: ${workspacePath}`);
        console.log(`报告文件: ${reportPath}`);
        console.log(`\n提示: 可以使用 Markdown 查看器打开报告文件查看效果`);

    } catch (error) {
        console.error('\n测试失败:', error);
        throw error;
    }
}

// 运行测试
runTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
