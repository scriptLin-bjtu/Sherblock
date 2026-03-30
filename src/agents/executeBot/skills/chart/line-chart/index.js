/**
 * CREATE_LINE_CHART Skill
 *
 * Generates a line chart for displaying trend data (e.g., token price, transaction volume over time)
 */

import { generateChart } from "../../lib/chart-generator.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

export default {
    name: "CREATE_LINE_CHART",

    description:
        "Generate a line chart for displaying trend data over time (e.g., token price changes, transaction volume trends)",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["yAxisName", "filename", "description"],
    },

    whenToUse: [
        "Need to display data trends over time",
        "Need to analyze token price movements, transaction volume changes, or other time series data",
        "Need to visualize trends of multiple data series for comparison",
    ],

    examples: [
        {
            description: "Display token price trend",
            params: {
                title: "ETH Price Trend",
                xAxis: ["2024-01-01", "2024-01-02", "2024-01-03"],
                series: [{ name: "ETH Price", data: [3500, 3550, 3480] }],
                yAxisName: "Price (USD)",
                filename: "eth-price-trend.svg",
                description: "Ethereum price trend for the past 3 days",
            },
        },
        {
            description: "Display multi-series comparison",
            params: {
                title: "Transaction Volume Trend Comparison",
                xAxis: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                series: [
                    { name: "Address A", data: [100, 150, 200, 180, 250] },
                    { name: "Address B", data: [80, 120, 160, 140, 200] },
                ],
                yAxisName: "Transaction Count",
                description: "Transaction activity comparison between two addresses over 5 days",
            },
        },
    ],

    async execute(params, context) {
        const { title, xAxis, series, yAxisName, filename, description } = params;

        try {
            // Validate inputs
            if (!Array.isArray(xAxis) || xAxis.length === 0) {
                throw new Error("xAxis must be a non-empty array");
            }
            if (!Array.isArray(series) || series.length === 0) {
                throw new Error("series must be a non-empty array");
            }
            for (const s of series) {
                if (!s.name || !Array.isArray(s.data) || s.data.length !== xAxis.length) {
                    throw new Error(
                        `Each series must have 'name' and 'data' array matching xAxis length`
                    );
                }
            }

            // Generate chart
            const result = await generateChart({
                type: "line",
                title,
                data: { xAxis, series },
                yAxisName,
                filename,
                description,
                workspaceManager,
                scopeManager,
            });

            console.log(
                `[CREATE_LINE_CHART] Chart saved to: ${result.filePath}`
            );

            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_LINE_CHART",
                    success: true,
                    data: {
                        message: "Line chart generated and saved to charts/ directory",
                        filePath: result.filePath,
                        filename: result.filename,
                        chartType: "line",
                        title,
                    },
                },
            };
        } catch (error) {
            console.error("[CREATE_LINE_CHART] Error:", error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_LINE_CHART",
                    success: false,
                    error: error.message,
                },
            };
        }
    },
};
