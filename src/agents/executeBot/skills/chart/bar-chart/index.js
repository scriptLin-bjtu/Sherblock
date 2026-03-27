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
        "生成柱状图，用于比较不同类别的数值（如不同地址的交易数量、代币余额等）",

    category: "chart",

    params: {
        required: ["title", "xAxis", "series"],
        optional: ["yAxisName", "filename", "description"],
    },

    whenToUse: [
        "需要比较不同类别的数值大小",
        "需要展示多个地址、代币或实体之间的对比",
        "需要分析交易数量、余额、费用等统计指标的对比",
    ],

    examples: [
        {
            description: "比较不同地址的交易数量",
            params: {
                title: "各地址交易数量统计",
                xAxis: ["0x1234...", "0x5678...", "0xabcd..."],
                series: [{ name: "交易数", data: [150, 200, 180] }],
                yAxisName: "交易数量",
                filename: "address-tx-counts.svg",
                description: "三个地址的总交易数量对比",
            },
        },
        {
            description: "比较多个系列的柱状图",
            params: {
                title: "代币持有量对比",
                xAxis: ["Alice", "Bob", "Charlie"],
                series: [
                    { name: "ETH", data: [5.5, 2.3, 10.0] },
                    { name: "USDC", data: [1000, 500, 2000] },
                ],
                yAxisName: "数量",
                description: "三个用户持有的不同代币数量",
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
                        message: "柱状图已生成并保存到 charts/ 目录",
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
