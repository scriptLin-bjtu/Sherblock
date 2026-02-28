/**
 * Create Scatter Chart Skill
 *
 * Generates a scatter chart for showing relationships between two variables.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_SCATTER_CHART",

    description: "Create a scatter chart to show relationships between two variables",

    category: "chart",

    params: {
        required: ["title", "series"],
        optional: ["filename", "xAxisName", "yAxisName", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to analyze relationship between two variables",
        "Showing transaction amount vs gas fee correlation",
        "Analyzing address balance vs transaction frequency",
    ],

    async execute(params, context) {
        const {
            title,
            series,  // Array of { name, data } where data is [[x1, y1], [x2, y2], ...]
            filename = `scatter-chart-${Date.now()}.png`,
            xAxisName = "X",
            yAxisName = "Y",
            width = 800,
            height = 600,
            theme = 'light',
            colors = null,
            backgroundColor = null
        } = params;

        const outputPath = `data/${filename}`;

        try {
            const option = {
                title: {
                    text: title,
                    left: 'center',
                    top: 20
                },
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        return `${params.seriesName}<br/>${params.data[0]}, ${params.data[1]}`;
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
                    type: 'value',
                    name: xAxisName,
                    splitLine: {
                        show: true,
                        lineStyle: {
                            type: 'dashed'
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: yAxisName,
                    splitLine: {
                        show: true,
                        lineStyle: {
                            type: 'dashed'
                        }
                    }
                },
                series: series.map(s => ({
                    name: s.name,
                    type: 'scatter',
                    data: s.data,
                    symbolSize: 10,
                    itemStyle: {
                        opacity: 0.8
                    }
                }))
            };

            const result = await generateChart(option, outputPath, {
                width, height, theme, colors, backgroundColor
            });
            return formatChartResult(result, this.name);
        } catch (error) {
            return formatChartError(error, this.name);
        }
    },
};
