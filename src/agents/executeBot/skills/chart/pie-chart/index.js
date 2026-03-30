/**
 * CREATE_PIE_CHART Skill
 *
 * Generates a pie chart for showing proportional data (e.g., portfolio distribution, fund flow ratios)
 */

import { generateChart } from "../../lib/chart-generator.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

export default {
    name: "CREATE_PIE_CHART",

    description:
        "Generate a pie chart for showing proportional data (e.g., portfolio distribution, fund flow ratios, transaction type distribution)",

    category: "chart",

    params: {
        required: ["title", "data"],
        optional: ["filename", "description"],
    },

    whenToUse: [
        "Need to show the proportion of each part within the whole",
        "Need to analyze distribution of portfolio, fund flows, transaction types, etc.",
        "Need to visualize percentage or ratio data",
    ],

    examples: [
        {
            description: "Display portfolio distribution",
            params: {
                title: "Portfolio Token Distribution",
                data: [
                    { name: "ETH", value: 50 },
                    { name: "USDC", value: 30 },
                    { name: "WBTC", value: 20 },
                ],
                filename: "portfolio-distribution.svg",
                description: "Value proportion of each token in the current portfolio",
            },
        },
        {
            description: "Display transaction type distribution",
            params: {
                title: "Transaction Type Statistics",
                data: [
                    { name: "Transfer", value: 150 },
                    { name: "Contract Call", value: 80 },
                    { name: "Token Transfer", value: 70 },
                ],
                description: "Distribution of different transaction types by count",
            },
        },
    ],

    async execute(params, context) {
        const { title, data, filename, description } = params;

        try {
            // Validate inputs
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("data must be a non-empty array");
            }
            for (const item of data) {
                if (!item.name || typeof item.value !== "number") {
                    throw new Error(
                        "Each data item must have 'name' (string) and 'value' (number)"
                    );
                }
            }

            // Generate chart
            const result = await generateChart({
                type: "pie",
                title,
                data,
                filename,
                description,
                workspaceManager,
                scopeManager,
            });

            console.log(
                `[CREATE_PIE_CHART] Chart saved to: ${result.filePath}`
            );

            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_PIE_CHART",
                    success: true,
                    data: {
                        message: "Pie chart generated and saved to charts/ directory",
                        filePath: result.filePath,
                        filename: result.filename,
                        chartType: "pie",
                        title,
                    },
                },
            };
        } catch (error) {
            console.error("[CREATE_PIE_CHART] Error:", error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_PIE_CHART",
                    success: false,
                    error: error.message,
                },
            };
        }
    },
};
