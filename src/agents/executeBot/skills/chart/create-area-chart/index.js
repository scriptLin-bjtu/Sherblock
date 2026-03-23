/**
 * Create Area Chart Skill
 *
 * Generates an area chart to emphasize quantity changes over time.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_AREA_CHART",

    description: "Create an area chart to emphasize quantity changes over time",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["filename", "yAxisName", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to emphasize quantity changes over time",
        "Showing cumulative transaction volume",
        "Displaying asset holding changes",
    ],

    async execute(params, context) {
        const {
            title,
            xAxis,  // Array of x-axis labels
            series,  // Array of { name, data }
            filename = `area-chart-${Date.now()}.png`,
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
                    smooth: true,
                    areaStyle: {
                        opacity: 0.3
                    },
                    lineStyle: {
                        width: 2
                    }
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
