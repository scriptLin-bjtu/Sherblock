/**
 * Prepare Chart Data Skill
 *
 * Extracts and transforms data from scope into visualization-ready formats.
 * Supports preparing data for various chart types including funnel, line, bar, radar charts.
 */

export default {
    name: "PREPARE_CHART_DATA",

    description: "Extract and transform data from scope into visualization-ready formats for chart generation",

    category: "chart",

    params: {
        required: ["scope"],
        optional: ["chart_types", "data_sources"],
    },

    whenToUse: [
        "Need to prepare visualization data before creating charts",
        "Transforming collected blockchain data for chart generation",
        "Preparing fund flow data for funnel charts",
        "Preparing time series data for line charts",
    ],

    async execute(params, context) {
        const { scope, chart_types = [], data_sources = {} } = params;

        const visualizationData = {};

        try {
            // 1. Prepare fund flow data for funnel chart
            if (chart_types.includes('funnel') || chart_types.includes('fund_flow')) {
                visualizationData.fund_flow = this._prepareFundFlowData(scope, data_sources);
            }

            // 2. Prepare time series data for line chart
            if (chart_types.includes('line') || chart_types.includes('time_series')) {
                visualizationData.time_series = this._prepareTimeSeriesData(scope, data_sources);
            }

            // 3. Prepare behavior profile data for radar chart
            if (chart_types.includes('radar') || chart_types.includes('behavior_profile')) {
                visualizationData.behavior_profile = this._prepareBehaviorProfileData(scope, data_sources);
            }

            // 4. Prepare distribution data for bar/pie chart
            if (chart_types.includes('bar') || chart_types.includes('pie') || chart_types.includes('distribution')) {
                visualizationData.distribution = this._prepareDistributionData(scope, data_sources);
            }

            console.log('[PrepareChartData] Prepared visualization data:', Object.keys(visualizationData));

            return {
                status: 'success',
                visualization_data: visualizationData,
                message: `Prepared chart data for: ${Object.keys(visualizationData).join(', ')}`
            };
        } catch (error) {
            console.error('[PrepareChartData] Error:', error.message);
            return {
                status: 'error',
                error: error.message,
                message: `Failed to prepare chart data: ${error.message}`
            };
        }
    },

    /**
     * Prepare fund flow data for funnel chart
     * @private
     */
    _prepareFundFlowData(scope, dataSources) {
        // Try to extract fund flow data from various possible sources
        const transactions = scope.normal_transactions || scope.transactions || [];
        const tokenTransfers = scope.token_transfers || [];

        // Group by sender/recipient to identify flow stages
        const flowStages = [];

        if (transactions.length > 0) {
            // Count unique senders
            const uniqueSenders = new Set(transactions.map(tx => tx.from || tx.sender)).size;
            flowStages.push({ name: 'Unique Senders', value: uniqueSenders });

            // Count unique recipients
            const uniqueRecipients = new Set(transactions.map(tx => tx.to || tx.recipient)).size;
            flowStages.push({ name: 'Unique Recipients', value: uniqueRecipients });

            // Total transaction count
            flowStages.push({ name: 'Total Transactions', value: transactions.length });
        }

        if (tokenTransfers.length > 0) {
            flowStages.push({ name: 'Token Transfers', value: tokenTransfers.length });
        }

        // Return in funnel chart format
        return {
            chart_type: 'funnel',
            data: flowStages.length > 0 ? flowStages : [{ name: 'No Data', value: 1 }]
        };
    },

    /**
     * Prepare time series data for line chart
     * @private
     */
    _prepareTimeSeriesData(scope, dataSources) {
        const transactions = scope.normal_transactions || scope.transactions || [];

        if (transactions.length === 0) {
            return {
                chart_type: 'line',
                xAxis: [],
                series: []
            };
        }

        // Sort by timestamp
        const sortedTx = [...transactions].sort((a, b) => {
            const timeA = a.timestamp || a.time || 0;
            const timeB = b.timestamp || b.time || 0;
            return timeA - timeB;
        });

        // Group by day (for display)
        const dailyVolume = {};
        const dailyCount = {};

        for (const tx of sortedTx) {
            const timestamp = tx.timestamp || tx.time || 0;
            const date = new Date(timestamp * 1000);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            const value = tx.value ? parseFloat(tx.value) / 1e18 : 0; // Convert wei to ETH
            dailyVolume[dateKey] = (dailyVolume[dateKey] || 0) + value;
            dailyCount[dateKey] = (dailyCount[dateKey] || 0) + 1;
        }

        const dates = Object.keys(dailyVolume).sort();
        const volumeData = dates.map(d => dailyVolume[d]);
        const countData = dates.map(d => dailyCount[d]);

        return {
            chart_type: 'line',
            xAxis: dates,
            series: [
                { name: 'Transaction Volume (ETH)', data: volumeData },
                { name: 'Transaction Count', data: countData }
            ]
        };
    },

    /**
     * Prepare behavior profile data for radar chart
     * @private
     */
    _prepareBehaviorProfileData(scope, dataSources) {
        const transactions = scope.normal_transactions || scope.transactions || [];

        if (transactions.length === 0) {
            return {
                chart_type: 'radar',
                indicators: [],
                series: []
            };
        }

        // Analyze behavioral dimensions
        const totalTx = transactions.length;
        const uniqueRecipients = new Set(transactions.map(tx => tx.to || tx.recipient)).size;
        const uniqueSenders = new Set(transactions.map(tx => tx.from || tx.sender)).size;

        // Calculate average value
        let totalValue = 0;
        let valueCount = 0;
        for (const tx of transactions) {
            if (tx.value) {
                totalValue += parseFloat(tx.value);
                valueCount++;
            }
        }
        const avgValue = valueCount > 0 ? (totalValue / valueCount / 1e18) : 0;

        // Normalize indicators to 0-100 scale
        const diversityRatio = totalTx > 0 ? (uniqueRecipients / totalTx) * 100 : 0;
        const sendingRatio = totalTx > 0 ? (uniqueSenders / totalTx) * 100 : 0;
        const volumeScore = Math.min(avgValue * 10, 100); // Scale ETH value to 0-100
        const frequencyScore = Math.min(totalTx / 10 * 100, 100); // Scale to 0-100

        return {
            chart_type: 'radar',
            indicators: [
                { name: 'Diversity', max: 100 },
                { name: 'Sending Activity', max: 100 },
                { name: 'Volume', max: 100 },
                { name: 'Frequency', max: 100 }
            ],
            series: [
                {
                    name: 'Address Behavior',
                    data: [diversityRatio, sendingRatio, volumeScore, frequencyScore]
                }
            ]
        };
    },

    /**
     * Prepare distribution data for bar/pie chart
     * @private
     */
    _prepareDistributionData(scope, dataSources) {
        const transactions = scope.normal_transactions || scope.transactions || [];

        if (transactions.length === 0) {
            return {
                chart_type: 'bar',
                xAxis: [],
                series: []
            };
        }

        // Count transactions by top addresses
        const addressCount = {};
        for (const tx of transactions) {
            const to = tx.to || tx.recipient;
            if (to) {
                addressCount[to] = (addressCount[to] || 0) + 1;
            }
        }

        // Get top 10 addresses
        const sortedAddresses = Object.entries(addressCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            chart_type: 'bar',
            xAxis: sortedAddresses.map(([addr]) => addr.slice(0, 10) + '...'),
            series: [
                {
                    name: 'Transaction Count',
                    data: sortedAddresses.map(([, count]) => count)
                }
            ]
        };
    }
};
