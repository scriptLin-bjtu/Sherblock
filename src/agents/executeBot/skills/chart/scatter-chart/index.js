/**
 * CREATE_SCATTER_CHART Skill
 *
 * Generates a scatter plot for analyzing correlations between two variables
 * (e.g., transaction amount vs gas fee)
 */

import { generateChart } from "../../lib/chart-generator.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

export default {
    name: "CREATE_SCATTER_CHART",

    description:
        "生成散点图，用于分析两个变量之间的相关性（如交易金额与 Gas 费用的关系）",

    category: "chart",

    params: {
        required: ["title", "series", "xAxisName", "yAxisName"],
        optional: ["filename", "description"],
    },

    whenToUse: [
        "需要分析两个变量之间的相关关系",
        "需要展示数据点的分布模式",
        "需要发现数据中的异常值或趋势",
    ],

    examples: [
        {
            description: "分析交易金额与 Gas 费用的关系",
            params: {
                title: "交易金额 vs Gas费用",
                series: [
                    {
                        name: "交易",
                        data: [
                            [1000000, 21000],
                            [5000000, 45000],
                            [10000000, 80000],
                            [2000000, 30000],
                            [7500000, 65000],
                        ],
                    },
                ],
                xAxisName: "交易金额 (Wei)",
                yAxisName: "Gas费用 (Wei)",
                filename: "tx-amount-vs-gas.svg",
                description: "交易金额与所需 Gas 费用的关系分析",
            },
        },
        {
            description: "多系列散点对比",
            params: {
                title: "地址活动时间 vs 交易数",
                series: [
                    {
                        name: "活跃地址",
                        data: [
                            [10, 50],
                            [30, 150],
                            [50, 300],
                            [70, 450],
                            [90, 600],
                        ],
                    },
                    {
                        name: "普通地址",
                        data: [
                            [5, 10],
                            [15, 20],
                            [25, 35],
                            [40, 50],
                            [60, 80],
                        ],
                    },
                ],
                xAxisName: "活跃天数",
                yAxisName: "交易数量",
                description: "不同类型地址的活跃度对比",
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
                        message: "散点图已生成并保存到 charts/ 目录",
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
