/**
 * Blockchain Analysis Chart Templates
 *
 * Predefined chart templates for common blockchain analysis scenarios.
 */

/**
 * Token Price Trend Template
 * Creates a line chart showing token price over time
 */
export function tokenPriceTrend({ prices, timestamps, title = '代币价格趋势' }) {
    return {
        title,
        xAxis: timestamps,
        series: [{
            name: '价格 (USD)',
            data: prices
        }],
        yAxisName: '价格 (USD)',
        theme: 'light',
        colors: ['#5470c6']
    };
}

/**
 * Address Activity Profile Template
 * Creates a radar chart showing multi-dimensional address metrics
 */
export function addressActivityProfile({ txCount, uniqueCounterparties, volume, avgGasUsed, uniqueDaysActive, title = '地址活动画像' }) {
    const maxTx = 1000;
    const maxCounterparties = 500;
    const maxVolume = 1000000; // 1M
    const maxGas = 500000;
    const maxDays = 365;

    return {
        title,
        indicators: [
            { name: '交易次数', max: maxTx },
            { name: '交互地址数', max: maxCounterparties },
            { name: '交易额', max: maxVolume },
            { name: '平均Gas', max: maxGas },
            { name: '活跃天数', max: maxDays }
        ],
        series: [{
            name: '地址画像',
            data: [
                Math.min(txCount || 0, maxTx),
                Math.min(uniqueCounterparties || 0, maxCounterparties),
                Math.min(volume || 0, maxVolume),
                Math.min(avgGasUsed || 0, maxGas),
                Math.min(uniqueDaysActive || 0, maxDays)
            ]
        }],
        theme: 'light'
    };
}

/**
 * Transaction Flow Analysis Template
 * Creates a funnel chart showing transaction flow through stages
 */
export function transactionFlowAnalysis({ stages = [], title = '交易流向分析' }) {
    // stages: Array of { name, count } representing transaction stages
    const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

    return {
        title,
        data: stages.map(s => ({
            name: s.name,
            value: totalCount > 0 ? ((s.count / totalCount) * 100).toFixed(2) : 0
        })),
        theme: 'light'
    };
}

/**
 * Portfolio Distribution Template
 * Creates a pie chart showing token/asset distribution
 */
export function portfolioDistribution({ assets = [], title = '投资组合分布' }) {
    // assets: Array of { name, value, symbol }
    return {
        title,
        data: assets.map(a => ({
            name: `${a.name} (${a.symbol})`,
            value: a.value
        })),
        theme: 'light',
        colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
    };
}

/**
 * Network Metrics Dashboard Template
 * Creates a gauge chart showing key network metric
 */
export function networkMetricsDashboard({ value, metric, title = '网络指标仪表盘', unit = '' }) {
    return {
        title,
        value,
        min: 0,
        max: 100,
        unit,
        theme: 'light'
    };
}

/**
 * Transaction Analysis Template
 * Creates a mixed chart combining transaction volume and fees
 */
export function transactionAnalysis({ labels, volumes, fees, title = '交易分析' }) {
    return {
        title,
        xAxis: labels,
        series: [
            {
                name: '交易量',
                type: 'bar',
                data: volumes
            },
            {
                name: 'Gas费用',
                type: 'line',
                data: fees
            }
        ],
        yAxisName: '数值',
        theme: 'light',
        colors: ['#5470c6', '#91cc75']
    };
}

/**
 * Gas Price Trend Template
 * Creates an area chart showing gas price over time
 */
export function gasPriceTrend({ gasPrices, timestamps, title = 'Gas价格趋势' }) {
    return {
        title,
        xAxis: timestamps,
        series: [{
            name: 'Gas价格 (Gwei)',
            data: gasPrices
        }],
        yAxisName: 'Gas价格 (Gwei)',
        theme: 'light'
    };
}

/**
 * Block Size Distribution Template
 * Creates a histogram-like bar chart for block size distribution
 */
export function blockSizeDistribution({ sizeRanges, counts, title = '区块大小分布' }) {
    return {
        title,
        xAxis: sizeRanges,
        series: [{
            name: '区块数量',
            data: counts
        }],
        yAxisName: '区块数量',
        theme: 'light'
    };
}

/**
 * Export all templates as an object for easy access
 */
export const templates = {
    tokenPriceTrend,
    addressActivityProfile,
    transactionFlowAnalysis,
    portfolioDistribution,
    networkMetricsDashboard,
    transactionAnalysis,
    gasPriceTrend,
    blockSizeDistribution
};

/**
 * Get a template by name
 * @param {string} templateName - Name of the template
 * @returns {Function|null} Template function or null
 */
export function getTemplate(templateName) {
    return templates[templateName] || null;
}

/**
 * List all available template names
 * @returns {string[]} Array of template names
 */
export function listTemplates() {
    return Object.keys(templates);
}
