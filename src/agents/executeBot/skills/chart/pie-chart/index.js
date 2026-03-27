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
        "生成饼图，用于展示数据的占比关系（如投资组合分布、资金流向比例、交易类型分布等）",

    category: "chart",

    params: {
        required: ["title", "data"],
        optional: ["filename", "description"],
    },

    whenToUse: [
        "需要展示各部分在整体中的占比",
        "需要分析投资组合、资金流向、交易类型等分布情况",
        "需要可视化百分比或比例数据",
    ],

    examples: [
        {
            description: "展示投资组合分布",
            params: {
                title: "投资组合代币分布",
                data: [
                    { name: "ETH", value: 50 },
                    { name: "USDC", value: 30 },
                    { name: "WBTC", value: 20 },
                ],
                filename: "portfolio-distribution.svg",
                description: "当前投资组合中各代币的价值占比",
            },
        },
        {
            description: "展示交易类型分布",
            params: {
                title: "交易类型统计",
                data: [
                    { name: "转账", value: 150 },
                    { name: "合约调用", value: 80 },
                    { name: "代币转账", value: 70 },
                ],
                description: "不同类型交易的数量分布",
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
                        message: "饼图已生成并保存到 charts/ 目录",
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
