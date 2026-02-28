/**
 * Create Line Chart Skill
 *
 * Generates a line chart for time series or trend data.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_LINE_CHART",

    description: "Create a line chart for time series or trend data visualization",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["filename", "yAxisName", "width", "height"],
    },

    whenToUse: [
        "Need to visualize trends over time",
        "Showing price movements or transaction volumes",
        "Displaying sequential data patterns",
    ],

    async execute(params, context) {
        const {
            title,
            xAxis,  // Array of x-axis labels
            series, // Array of series data [{ name, data }]
            filename = `line-chart-${Date.now()}.png`,
            yAxisName = "Value",
            width = 800,
            height = 600,
        } = params;

        const outputPath = `data/${filename}`;

        try {
            const option = {
                backgroundColor: '#ffffff',
                title: {
                    text: title,
                    left: 'center',
                    top: 20
                },
                tooltip: {
                    trigger: 'axis'
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
                    boundaryGap: false,
                    data: xAxis
                },
                yAxis: {
                    type: 'value',
                    name: yAxisName
                },
                series: series.map(s => ({
                    name: s.name,
                    type: 'line',
                    data: s.data,
                    smooth: true
                }))
            };

            const result = await generateChart(option, outputPath, { width, height });
            return formatChartResult(result, this.name);
        } catch (error) {
            return formatChartError(error, this.name);
        }
    },
};
