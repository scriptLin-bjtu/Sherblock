/**
 * CREATE_BAR_CHART Skill
 *
 * Generates a bar chart for comparing data values (e.g., transaction counts by address, token balances)
 */

import { generateChart } from "../../lib/chart-generator.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

export default {
    name: "CREATE_BAR_CHART",

    description:
        "Generate a bar chart for comparing values across different categories (e.g., transaction counts by address, token balances)",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["yAxisName", "filename", "description"],
    },

    whenToUse: [
        "Need to compare values across different categories",
        "Need to display comparisons between multiple addresses, tokens, or entities",
        "Need to analyze comparisons of statistical metrics like transaction counts, balances, fees, etc.",
    ],

    examples: [
        {
            description: "Compare transaction counts of different addresses",
            params: {
                title: "Transaction Count Statistics by Address",
                xAxis: ["0x1234...", "0x5678...", "0xabcd..."],
                series: [{ name: "Transactions", data: [150, 200, 180] }],
                yAxisName: "Transaction Count",
                filename: "address-tx-counts.svg",
                description: "Comparison of total transaction counts for three addresses",
            },
        },
        {
            description: "Multi-series bar chart comparison",
            params: {
                title: "Token Holdings Comparison",
                xAxis: ["Alice", "Bob", "Charlie"],
                series: [
                    { name: "ETH", data: [5.5, 2.3, 10.0] },
                    { name: "USDT", data: [1000, 500, 2000] },
                ],
                yAxisName: "Amount",
                description: "Comparison of different token holdings for three users",
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
                type: "bar",
                title,
                data: { xAxis, series },
                yAxisName,
                filename,
                description,
                workspaceManager,
                scopeManager,
            });

            console.log(
                `[CREATE_BAR_CHART] Chart saved to: ${result.filePath}`
            );

            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_BAR_CHART",
                    success: true,
                    data: {
                        message: "Bar chart generated and saved to charts/ directory",
                        filePath: result.filePath,
                        filename: result.filename,
                        chartType: "bar",
                        title,
                    },
                },
            };
        } catch (error) {
            console.error("[CREATE_BAR_CHART] Error:", error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_BAR_CHART",
                    success: false,
                    error: error.message,
                },
            };
        }
    },
};
