/**
 * Create Funnel Chart Skill
 *
 * Generates a funnel chart to show conversion rate or stage reduction.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_FUNNEL_CHART",

    description: "Create a funnel chart to show conversion rate or stage reduction",

    category: "chart",

    params: {
        required: ["title", "data"],
        optional: ["filename", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to show conversion rate or stage reduction",
        "Analyzing transaction flow funnel",
        "Displaying fund flow analysis",
    ],

    async execute(params, context) {
        const {
            title,
            data,  // Array of { name, value }
            filename = `funnel-chart-${Date.now()}.png`,
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
                    trigger: 'item',
                    formatter: '{a} <br/>{b} : {c}%'
                },
                legend: {
                    data: data.map(d => d.name),
                    top: 60
                },
                series: [{
                    name: title,
                    type: 'funnel',
                    left: '10%',
                    top: 60,
                    bottom: '10%',
                    width: '80%',
                    min: 0,
                    max: Math.max(...data.map(d => d.value)),
                    minSize: '0%',
                    maxSize: '100%',
                    sort: 'descending',
                    gap: 2,
                    label: {
                        show: true,
                        position: 'inside'
                    },
                    labelLine: {
                        length: 10,
                        lineStyle: {
                            width: 1,
                            type: 'solid'
                        }
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 1
                    },
                    emphasis: {
                        label: {
                            fontSize: 20
                        }
                    },
                    data: data
                }]
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
