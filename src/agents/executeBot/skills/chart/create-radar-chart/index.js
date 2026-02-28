/**
 * Create Radar Chart Skill
 *
 * Generates a radar chart for multi-dimensional data comparison.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CREATE_RADAR_CHART",

    description: "Create a radar chart for multi-dimensional data comparison",

    category: "chart",

    params: {
        required: ["title", "indicators", "series"],
        optional: ["filename", "width", "height", "theme", "colors", "backgroundColor"],
    },

    whenToUse: [
        "Need to compare multiple dimensions",
        "Showing address activity profile across multiple metrics",
        "Creating risk assessment radar chart",
    ],

    async execute(params, context) {
        const {
            title,
            indicators,  // Array of { name, max } or { name }
            series,      // Array of { name, data }
            filename = `radar-chart-${Date.now()}.png`,
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
                    trigger: 'item'
                },
                legend: {
                    data: series.map(s => s.name),
                    top: 60
                },
                radar: {
                    indicator: indicators.map(i => ({
                        name: i.name,
                        max: i.max || 100
                    })),
                    center: ['50%', '60%'],
                    radius: '60%'
                },
                series: [{
                    name: title,
                    type: 'radar',
                    data: series.map(s => ({
                        name: s.name,
                        value: s.data,
                        areaStyle: {
                            opacity: 0.3
                        }
                    }))
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
