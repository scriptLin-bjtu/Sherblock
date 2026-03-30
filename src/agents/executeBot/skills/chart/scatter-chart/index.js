/**
 * CREATE_SCATTER_CHART Skill
 *
 * Generates a scatter plot for analyzing correlations (e.g., transaction amount vs gas fee)
 */

import { generateChart } from "../../lib/chart-generator.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

export default {
    name: "CREATE_SCATTER_CHART",

    description:
        "Generate a scatter plot for analyzing correlations between two variables (e.g., transaction amount vs gas fee)",

    category: "chart",

    params: {
        required: ["title", "series", "xAxisName", "yAxisName"],
        optional: ["filename", "description"],
    },

    whenToUse: [
        "Need to analyze correlation between two variables",
        "Need to display data point distribution patterns",
        "Need to identify outliers or trends in data",
    ],

    examples: [
        {
            description: "Analyze relationship between transaction amount and gas fee",
            params: {
                title: "Transaction Amount vs Gas Fee",
                series: [
                    {
                        name: "Transactions",
                        data: [
                            [1000000, 21000],
                            [5000000, 45000],
                            [10000000, 80000],
                            [2000000, 30000],
                            [7500000, 65000],
                        ],
                    },
                ],
                xAxisName: "Transaction Amount (Wei)",
                yAxisName: "Gas Fee (Wei)",
                filename: "tx-amount-vs-gas.svg",
                description: "Analysis of relationship between transaction amount and required gas fee",
            },
        },
        {
            description: "Multi-series scatter comparison",
            params: {
                title: "Address Activity Days vs Transaction Count",
                series: [
                    {
                        name: "Active Address",
                        data: [
                            [10, 50],
                            [30, 150],
                            [50, 300],
                            [70, 450],
                            [90, 600],
                        ],
                    },
                    {
                        name: "Normal Address",
                        data: [
                            [5, 10],
                            [15, 20],
                            [25, 35],
                            [40, 50],
                            [60, 80],
                        ],
                    },
                ],
                xAxisName: "Active Days",
                yAxisName: "Transaction Count",
                description: "Activity level comparison between different address types",
            },
        },
    ],

    async execute(params, context) {
        const { title, series, xAxisName, yAxisName, filename, description } = params;

        try {
            // Validate inputs
            if (!Array.isArray(series) || series.length === 0) {
                throw new Error("series must be a non-empty array");
            }
            for (const s of series) {
                if (!s.name || !Array.isArray(s.data) || s.data.length === 0) {
                    throw new Error(
                        "Each series must have 'name' and non-empty 'data' array"
                    );
                }
                // Validate data points format [x, y]
                for (const point of s.data) {
                    if (
                        !Array.isArray(point) ||
                        point.length !== 2 ||
                        typeof point[0] !== "number" ||
                        typeof point[1] !== "number"
                    ) {
                        throw new Error(
                            "Each data point must be a 2-element number array [x, y]"
                        );
                    }
                }
            }

            // Generate chart
            const result = await generateChart({
                type: "scatter",
                title,
                data: { series },
                xAxisName,
                yAxisName,
                filename,
                description,
                workspaceManager,
                scopeManager,
            });

            console.log(
                `[CREATE_SCATTER_CHART] Chart saved to: ${result.filePath}`
            );

            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_SCATTER_CHART",
                    success: true,
                    data: {
                        message: "Scatter plot generated and saved to charts/ directory",
                        filePath: result.filePath,
                        filename: result.filename,
                        chartType: "scatter",
                        title,
                    },
                },
            };
        } catch (error) {
            console.error("[CREATE_SCATTER_CHART] Error:", error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_SCATTER_CHART",
                    success: false,
                    error: error.message,
                },
            };
        }
    },
};
