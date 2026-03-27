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
        "生成折线图，用于展示趋势数据（如代币价格、交易量随时间变化）",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["yAxisName", "filename", "description"],
    },

    whenToUse: [
        "需要展示数据随时间的变化趋势",
        "需要分析代币价格走势、交易量变化等时间序列数据",
        "需要可视化多个数据系列的趋势对比",
    ],

    examples: [
        {
            description: "展示代币价格趋势",
            params: {
                title: "ETH Price Trend",
                xAxis: ["2024-01-01", "2024-01-02", "2024-01-03"],
                series: [{ name: "ETH Price", data: [3500, 3550, 3480] }],
                yAxisName: "Price (USD)",
                filename: "eth-price-trend.svg",
                description: "Ethereum 价格最近3天的走势",
            },
        },
        {
            description: "展示多系列对比",
            params: {
                title: "交易量趋势对比",
                xAxis: ["周一", "周二", "周三", "周四", "周五"],
                series: [
                    { name: "地址A", data: [100, 150, 200, 180, 250] },
                    { name: "地址B", data: [80, 120, 160, 140, 200] },
                ],
                yAxisName: "交易数量",
                description: "两个地址在5天内的交易活动对比",
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
                        message: "折线图已生成并保存到 charts/ 目录",
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
