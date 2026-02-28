/**
 * Create Heatmap Chart Skill
 *
 * Generates a heatmap chart to show density of matrix data.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_HEATMAP_CHART",

    description: "Create a heatmap chart to show density of matrix data",

    category: "chart",

    params: {
        required: ["title", "data", "xAxis", "yAxis"],
        optional: ["filename", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to show matrix data density",
        "Showing address-to-address transaction frequency heatmap",
        "Visualizing time-address activity matrix",
    ],

    async execute(params, context) {
        const {
            title,
            data,   // Array of [xIndex, yIndex, value] or [x, y, value]
            xAxis,  // Array of x-axis labels
            yAxis,  // Array of y-axis labels
            filename = `heatmap-chart-${Date.now()}.png`,
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
                    position: 'top',
                    formatter: function(params) {
                        return `${xAxis[params.data[0]]} - ${yAxis[params.data[1]]}<br/>Value: ${params.data[2]}`;
                    }
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
                    splitArea: {
                        show: true
                    }
                },
                yAxis: {
                    type: 'category',
                    data: yAxis,
                    splitArea: {
                        show: true
                    }
                },
                visualMap: {
                    min: 0,
                    max: Math.max(...data.map(d => d[2])),
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '5%'
                },
                series: [{
                    name: title,
                    type: 'heatmap',
                    data: data,
                    label: {
                        show: false
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
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
