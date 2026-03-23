/**
 * Create Bar Chart Skill
 *
 * Generates a bar chart for comparison data.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_BAR_CHART",

    description: "Create a bar chart for data comparison",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["filename", "yAxisName", "width", "height"],
    },

    whenToUse: [
        "Need to compare values across categories",
        "Showing transaction counts by address",
        "Displaying ranked data",
    ],

    async execute(params, context) {
        const {
            title,
            xAxis,
            series,
            filename = `bar-chart-${Date.now()}.png`,
            yAxisName = "Value",
            width = 800,
            height = 600,
        } = params;

        const outputPath = filename;

        try {
            const option = {
                backgroundColor: '#ffffff',
                title: {
                    text: title,
                    left: 'center',
                    top: 20
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                },
                legend: {
                    data: series.map(s => s.name),
                    top: 60
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: xAxis
                },
                yAxis: {
                    type: 'value',
                    name: yAxisName
                },
                series: series.map(s => ({
                    name: s.name,
                    type: 'bar',
                    data: s.data
                }))
            };

            const result = await generateChart(option, outputPath, { width, height, workspacePath: context?.workspacePath });
            return formatChartResult(result, this.name);
        } catch (error) {
            return formatChartError(error, this.name);
        }
    },
};
