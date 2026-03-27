/**
 * CREATE_RADAR_CHART Skill
 *
 * Generates a radar chart for multi-dimensional analysis
 * (e.g., address activity profile, risk assessment)
 */

import { generateChart } from "../../lib/chart-generator.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import { scopeManager } from "../../../../../utils/scope-manager.js";

export default {
    name: "CREATE_RADAR_CHART",

    description:
        "生成雷达图，用于多维度数据对比分析（如地址活动画像、风险评估、综合评分）",

    category: "chart",

    params: {
        required: ["title", "indicators", "series"],
        optional: ["filename", "description"],
    },

    whenToUse: [
        "需要对比多个实体在多个维度上的表现",
        "需要创建地址活动画像或风险评估可视化",
        "需要展示综合评分或性能指标的多维对比",
    ],

    examples: [
        {
            description: "地址活动画像分析",
            params: {
                title: "地址活动画像对比",
                indicators: [
                    { name: "交易次数", max: 1000 },
                    { name: "交互地址数", max: 500 },
{ name: "交易额", max: 1000000 },
                    { name: "平均Gas", max: 500000 },
                    { name: "活跃天数", max: 365 },
                ],
                series: [
                    {
                        name: "地址A",
                        data: [800, 200, 500000, 250000, 100],
                    },
                    {
                        name: "地址B",
                        data: [300, 150, 200000, 150000, 50],
                    },
                ],
                filename: "address-profile-radar.svg",
                description: "两个地址在5个维度上的活动对比",
            },
        },
        {
            description: "风险评估可视化",
            params: {
                title: "地址风险评估",
                indicators: [
                    { name: "交易频率", max: 10 },
                    { name: "资金规模", max: 10 },
                    { name: "交互复杂度", max: 10 },
                    { name: "时间集中度", max: 10 },
                    { name: "地址关联度", max: 10 },
                ],
                series: [
                    {
                        name: "目标地址",
                        data: [8, 7, 5, 6, 4],
                    },
                    {
                        name: "正常基准",
                        data: [5, 5, 3, 4, 2],
                    },
                ],
                description: "目标地址与正常基准的风险维度对比",
            },
        },
    ],

    async execute(params, context) {
        const { title, indicators, series, filename, description } = params;

        try {
            // Validate inputs
            if (!Array.isArray(indicators) || indicators.length < 3) {
                throw new Error("indicators must be an array with at least 3 items");
            }
            for (const ind of indicators) {
                if (!ind.name || typeof ind.max !== "number" || ind.max <= 0) {
                    throw new Error(
                        "Each indicator must have 'name' and positive 'max' value"
                    );
                }
            }

            if (!Array.isArray(series) || series.length === 0) {
                throw new Error("series must be a non-empty array");
            }
            for (const s of series) {
                if (!s.name || !Array.isArray(s.data) || s.data.length !== indicators.length) {
                    throw new Error(
                        `Each series must have 'name' and 'data' array matching indicators length`
                    );
                }
                for (let i = 0; i < s.data.length; i++) {
                    if (typeof s.data[i] !== "number" || s.data[i] < 0) {
                        throw new Error(
                            "Series data values must be non-negative numbers"
                        );
                    }
                }
            }

            // Generate chart
            const result = await generateChart({
                type: "radar",
                title,
                data: { series },
                indicators,
                filename,
                description,
                workspaceManager,
                scopeManager,
            });

            console.log(
                `[CREATE_RADAR_CHART] Chart saved to: ${result.filePath}`
            );

            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_RADAR_CHART",
                    success: true,
                    data: {
                        message: "雷达图已生成并保存到 charts/ 目录",
                        filePath: result.filePath,
                        filename: result.filename,
                        chartType: "radar",
                        title,
                    },
                },
            };
        } catch (error) {
            console.error("[CREATE_RADAR_CHART] Error:", error.message);
            return {
                type: "OBSERVATION",
                content: {
                    skill: "CREATE_RADAR_CHART",
                    success: false,
                    error: error.message,
                },
            };
        }
    },
};
