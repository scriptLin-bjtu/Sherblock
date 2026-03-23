/**
 * Custom Chart Skill
 *
 * Generates a chart with full ECharts configuration control.
 */

import {
    generateChart,
    formatChartResult,
    formatChartError,
} from "../../lib/echarts-client.js";

export default {
    name: "CUSTOM_CHART",

    description: "Create a custom chart with full ECharts configuration control",

    category: "chart",

    params: {
        required: ["option"],
        optional: ["filename", "width", "height"],
    },

    whenToUse: [
        "Need to create a complex or custom chart",
        "Using advanced ECharts features",
        "Combining multiple chart types",
    ],

    async execute(params, context) {
        const {
            option,  // Full ECharts configuration object
            filename = `custom-chart-${Date.now()}.png`,
            width = 800,
            height = 600,
        } = params;

        const outputPath = filename;

        try {
            const result = await generateChart(option, outputPath, { width, height, workspacePath: context?.workspacePath });
            return formatChartResult(result, this.name);
        } catch (error) {
            return formatChartError(error, this.name);
        }
    },
};
