/**
 * Create Pie Chart Skill
 *
 * Generates a pie chart for distribution data.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_PIE_CHART",

    description: "Create a pie chart for data distribution visualization",

    category: "chart",

    params: {
        required: ["title", "data"],
        optional: ["filename", "width", "height"],
    },

    whenToUse: [
        "Need to show distribution or proportions",
        "Visualizing token holdings distribution",
        "Showing address activity breakdown",
    ],

    async execute(params, context) {
        const {
            title,
            data,  // Array of { name, value }
            filename = `pie-chart-${Date.now()}.png`,
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
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: data.map(d => d.name)
                },
                series: [{
                    name: title,
                    type: 'pie',
                    radius: '50%',
                    center: ['50%', '60%'],
                    data: data,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            };

            const result = await generateChart(option, outputPath, { width, height, workspacePath: context?.workspacePath });
            return formatChartResult(result, this.name);
        } catch (error) {
            return formatChartError(error, this.name);
        }
    },
};
