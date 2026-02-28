/**
 * Test script for ECharts chart generation
 */

import { skillRegistry } from './agents/executeBot/skills/index.js';

async function testCharts() {
    await skillRegistry.initialize();
    await import('./agents/executeBot/skills/index.js').then(m => console.log(m.skillRegistry.generateCapabilitySummary()));

    // Test CREATE_LINE_CHART
    console.log('\n=== Testing CREATE_LINE_CHART ===');
    const lineChartSkill = skillRegistry.getSkill('CREATE_LINE_CHART');
    const lineResult = await lineChartSkill.skill.execute({
        title: 'ETH Price Trend',
        xAxis: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        series: [
            { name: 'Price', data: [3500, 3550, 3480, 3600, 3580, 3650, 3620] }
        ],
        filename: 'test-line-chart.png',
        yAxisName: 'Price (USD)'
    });
    console.log(lineResult);

    // Test CREATE_BAR_CHART
    console.log('\n=== Testing CREATE_BAR_CHART ===');
    const barChartSkill = skillRegistry.getSkill('CREATE_BAR_CHART');
    const barResult = await barChartSkill.skill.execute({
        title: 'Transaction Counts by Address',
        xAxis: ['Address A', 'Address B', 'Address C', 'Address D'],
        series: [
            { name: 'Tx Count', data: [150, 200, 180, 120] }
        ],
        filename: 'test-bar-chart.png',
        yAxisName: 'Transaction Count'
    });
    console.log(barResult);

    // Test CREATE_PIE_CHART
    console.log('\n=== Testing CREATE_PIE_CHART ===');
    const pieChartSkill = skillRegistry.getSkill('CREATE_PIE_CHART');
    const pieResult = await pieChartSkill.skill.execute({
        title: 'Token Distribution',
        data: [
            { name: 'Token A', value: 35 },
            { name: 'Token B', value: 25 },
            { name: 'Token C', value: 20 },
            { name: 'Token D', value: 20 }
        ],
        filename: 'test-pie-chart.png'
    });
    console.log(pieResult);

    // Test CREATE_SCATTER_CHART
    console.log('\n=== Testing CREATE_SCATTER_CHART ===');
    const scatterChartSkill = skillRegistry.getSkill('CREATE_SCATTER_CHART');
    const scatterResult = await scatterChartSkill.skill.execute({
        title: '交易金额 vs Gas费用',
        series: [
            {
                name: '交易',
                data: [
                    [1000000, 21000],
                    [5000000, 45000],
                    [10000000, 80000],
                    [2000000, 30000],
                    [7500000, 65000],
                    [3000000, 40000],
                    [15000000, 120000]
                ]
            }
        ],
        filename: 'test-scatter-chart.png',
        xAxisName: '交易金额 (Wei)',
        yAxisName: 'Gas费用 (Wei)'
    });
    console.log(scatterResult);

    // Test CREATE_RADAR_CHART
    console.log('\n=== Testing CREATE_RADAR_CHART ===');
    const radarChartSkill = skillRegistry.getSkill('CREATE_RADAR_CHART');
    const radarResult = await radarChartSkill.skill.execute({
        title: '地址活动画像',
        indicators: [
            { name: '交易次数', max: 1000 },
            { name: '交互地址数', max: 500 },
            { name: '交易额', max: 1000000 },
            { name: '平均Gas', max: 500000 },
            { name: '活跃天数', max: 365 }
        ],
        series: [
            {
                name: '地址A',
                data: [800, 200, 500000, 250000, 100]
            },
            {
                name: '地址B',
                data: [300, 150, 200000, 150000, 50]
            }
        ],
        filename: 'test-radar-chart.png'
    });
    console.log(radarResult);

    // Test CREATE_AREA_CHART
    console.log('\n=== Testing CREATE_AREA_CHART ===');
    const areaChartSkill = skillRegistry.getSkill('CREATE_AREA_CHART');
    const areaResult = await areaChartSkill.skill.execute({
        title: '累计交易量趋势',
        xAxis: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
            { name: '交易量', data: [1000, 2500, 4500, 7000, 9500, 12000] }
        ],
        filename: 'test-area-chart.png',
        yAxisName: '累计交易量'
    });
    console.log(areaResult);

    // Test CREATE_MIXED_CHART
    console.log('\n=== Testing CREATE_MIXED_CHART ===');
    const mixedChartSkill = skillRegistry.getSkill('CREATE_MIXED_CHART');
    const mixedResult = await mixedChartSkill.skill.execute({
        title: '交易量 vs 手续费',
        xAxis: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
            { name: '交易量', type: 'bar', data: [1000, 1500, 2000, 2500.0, 3000] },
            { name: 'Gas费用', type: 'line', data: [0.1, 0.15, 0.2, 0.25, 0.3] }
        ],
        filename: 'test-mixed-chart.png',
        yAxisName: '数值'
    });
    console.log(mixedResult);

    // Test CREATE_HEATMAP_CHART
    console.log('\n=== Testing CREATE_HEATMAP_CHART ===');
    const heatmapChartSkill = skillRegistry.getSkill('CREATE_HEATMAP_CHART');
    const heatmapResult = await heatmapChartSkill.skill.execute({
        title: '地址间交易频率热力图',
        data: [
            [0, 0, 10],
            [0, 1, 5],
            [0, 2, 3],
            [1, 0, 5],
            [1, 1, 0],
            [1, 2, 8],
            [2, 0, 3],
            [2, 1, 8],
            [2, 2, 0]
        ],
        xAxis: ['地址A', '地址B', '地址C'],
        yAxis: ['地址A', '地址B', '地址C'],
        filename: 'test-heatmap-chart.png'
    });
    console.log(heatmapResult);

    // Test CREATE_GAUGE_CHART
    console.log('\n=== Testing CREATE_GAUGE_CHART ===');
    const gaugeChartSkill = skillRegistry.getSkill('CREATE_GAUGE_CHART');
    const gaugeResult = await gaugeChartSkill.skill.execute({
        title: '风险评分仪表盘',
        value: 75,
        min: 0,
        max: 100,
        unit: '分',
        filename: 'test-gauge-chart.png'
    });
    console.log(gaugeResult);

    // Test CREATE_FUNNEL_CHART
    console.log('\n=== Testing CREATE_FUNNEL_CHART ===');
    const funnelChartSkill = skillRegistry.getSkill('CREATE_FUNNEL_CHART');
    const funnelResult = await funnelChartSkill.skill.execute({
        title: '交易流程漏斗',
        data: [
            { name: '发起交易', value: 1000 },
            { name: '确认中', value: 850 },
            { name: '已确认', value: 800 },
            { name: '上链成功', value: 780 }
        ],
        filename: 'test-funnel-chart.png'
    });
    console.log(funnelResult);

    // Test SVG Export
    console.log('\n=== Testing SVG Export ===');
    const svgResult = await lineChartSkill.skill.execute({
        title: 'SVG测试 - ETH价格趋势',
        xAxis: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
        series: [
            { name: 'Price', data: [3500, 3550, 3480, 3600, 3580] }
        ],
        filename: 'test-svg-chart.svg',
        format: 'svg',
        yAxisName: 'Price (USD)'
    });
    console.log(svgResult);

    // Test Dark Theme
    console.log('\n=== Testing Dark Theme ===');
    const darkResult = await barChartSkill.skill.execute({
        title: '深色主题测试 - 交易统计',
        xAxis: ['地址A', '地址B', '地址C'],
        series: [
            { name: '交易数', data: [150, 200, 180] }
        ],
        filename: 'test-dark-theme.png',
        yAxisName: '交易数',
        theme: 'dark'
    });
    console.log(darkResult);

    // Test Custom Colors
    console.log('\n=== Testing Custom Colors ===');
    const colorResult = await pieChartSkill.skill.execute({
        title: '自定义颜色测试',
        data: [
            { name: '类别A', value: 30 },
            { name: '类别B', value: 25 },
            { name: '类别C', value: 45 }
        ],
        filename: 'test-custom-colors.png',
        colors: ['#FF5733', '#33FF57', '#3357FF']
    });
    console.log(colorResult);

    // Test Blockchain Templates
    console.log('\n=== Testing Blockchain Templates ===');
    const { tokenPriceTrend, addressActivityProfile, portfolioDistribution } = await import('./agents/executeBot/skills/chart/templates/blockchain.js');

    const tokenTemplate = tokenPriceTrend({
        prices: [3500, 3550, 3480, 3600, 3580, 3650, 3620],
        timestamps: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        title: '模板测试 - 代币价格趋势'
    });
    const templateResult1 = await lineChartSkill.skill.execute(tokenTemplate);
    console.log('Token Price Template Result:', templateResult1);

    const addressTemplate = addressActivityProfile({
        txCount: 800,
        uniqueCounterparties: 200,
        volume: 500000,
        avgGasUsed: 250000,
        uniqueDaysActive: 100,
        title: '模板测试 - 地址活动画像'
    });
    const templateResult2 = await radarChartSkill.skill.execute(addressTemplate);
    console.log('Address Activity Template Result:', templateResult2);

    const portfolioTemplate = portfolioDistribution({
        assets: [
            { name: 'Ethereum', symbol: 'ETH', value: 50 },
            { name: 'USDC', symbol: 'USDC', value: 30 },
            { name: 'Bitcoin', symbol: 'WBTC', value: 20 }
        ],
        title: '模板测试 - 投资组合分布'
    });
    const templateResult3 = await pieChartSkill.skill.execute(portfolioTemplate);
    console.log('Portfolio Template Result:', templateResult3);

    // Check registered chart skills
    console.log('\n=== Chart Skills Registration Check ===');
    const chartSkills = skillRegistry.getSkillsByCategory('chart');
    console.log(`Total chart skills: ${chartSkills.length}`);
    chartSkills.forEach(skill => {
        console.log(`  - ${skill.name}: ${skill.description}`);
    });

    console.log('\n=== All tests completed ===');
    console.log('Check data/ directory for generated images');
}

testCharts().catch(console.error);
