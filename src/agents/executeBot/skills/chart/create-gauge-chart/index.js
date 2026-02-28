/**
 * Create Gauge Chart Skill
 *
 * Generates a gauge chart to display key metric progress.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_GAUGE_CHART",

    description: "Create a gauge chart to display key metric progress",

    category: "chart",

    params: {
        required: ["title", "value"],
        optional: ["filename", "min", "max", "unit", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to display a key metric progress",
        "Showing risk score gauge",
        "Displaying health score or completion percentage",
    ],

    async execute(params, context) {
        const {
            title,
            value,
            filename = `gauge-chart-${Date.now()}.png`,
            min = 0,
            max = 100,
            unit = '',
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
                series: [{
                    name: title,
                    type: 'gauge',
                    min,
                    max,
                    axisLine: {
                        lineStyle: {
                            width: 30,
                            color: [
                                [0.3, '#67e0e3'],
                                [0.7, '#37a2da'],
                                [1, '#fd666d']
                            ]
                        }
                    },
                    pointer: {
                        itemStyle: {
                            color: 'auto'
                        }
                    },
                    axisTick: {
                        distance: -30,
                        length: 8,
                        lineStyle: {
                            color: '#fff',
                            width: 2
                        }
                    },
                    splitLine: {
                        distance: -30,
                        length: 30,
                        lineStyle: {
                            color: '#fff',
                            width: 4
                        }
                    },
                    axisLabel: {
                        color: 'inherit',
                        distance: 15,
                        fontSize: 12
                    },
                    detail: {
                        valueAnimation: true,
                        formatter: `{value}${unit}`,
                        color: 'inherit',
                        fontSize: 24,
                        offsetCenter: [0, '70%']
                    },
                    data: [{
                        value: value,
                        name: 'Score'
                    }]
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
