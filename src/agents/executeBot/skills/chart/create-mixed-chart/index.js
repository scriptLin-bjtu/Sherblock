/**
 * Create Mixed Chart Skill
 *
 * Generates a mixed chart combining multiple chart types.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_MIXED_CHART",

    description: "Create a mixed chart combining multiple chart types (bar, line, etc.)",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["filename", "yAxisName", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to combine multiple chart types",
        "Showing price (bar) + holdings (line) comparison",
        "Displaying transaction volume + fees together",
    ],

    async execute(params, context) {
        const {
            title,
            xAxis,  // Array of x-axis labels
            series,  // Array of { name, type, data } where type can be 'bar', 'line', 'scatter', etc.
            filename = `mixed-chart-${Date.now()}.png`,
            yAxisName = "Value",
            width = 800,
            height = 600,
            theme = 'light',
            colors = null,
            backgroundColor = null
        } = params;

        const outputPath = filename;

        try {
            const option = {
                title: {
                    text: title,
                    left: 'center',
                    top: 20
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    }
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
                    data: xAxis,
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                yAxis: {
                    type: 'value',
                    name: yAxisName
                },
                series: series.map(s => ({
                    name: s.name,
                    type: s.type || 'bar',
                    data: s.data,
                    smooth: s.type === 'line'
                }))
            };

            const result = await generateChart(option, outputPath, {
                width, height, theme, colors, backgroundColor, workspacePath: context?.workspacePath
            });
            return formatChartResult(result, this.name);
        } catch (error) {
            return formatChartError(error, this.name);
        }
    },
};
