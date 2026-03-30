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
        "Generate a radar chart for multi-dimensional comparison analysis (e.g., address activity profile, risk assessment, comprehensive scoring)",

    category: "chart",

    params: {
        required: ["title", "indicators", "series"],
        optional: ["filename", "description"],
    },

    whenToUse: [
        "Need to compare performance of multiple entities across multiple dimensions",
        "Need to create address activity profile visualization or risk assessment",
        "Need to display multi-dimensional comparison of comprehensive scores or performance metrics",
    ],

    examples: [
        {
            description: "Address activity profile analysis",
            params: {
                title: "Address Activity Profile Comparison",
                indicators: [
                    { name: "Transaction Count", max: 1000 },
                    { name: "Unique Addresses Interacted", max: 500 },
                    { name: "Transaction Amount", max: 1000000 },
                    { name: "Average Gas", max: 500000 },
                    { name: "Active Days", max: 365 },
                ],
                series: [
                    {
                        name: "Address A",
                        data: [800, 200, 500000, 250000, 100],
                    },
                    {
                        name: "Address B",
                        data: [300, 150, 200000, 150000, 50],
                    },
                ],
                filename: "address-profile-radar.svg",
                description: "Comparison of activity between two addresses across 5 dimensions",
            },
        },
        {
            description: "Risk assessment visualization",
            params: {
                title: "Address Risk Assessment",
                indicators: [
                    { name: "Transaction Frequency", max: 10 },
                    { name: "Fund Scale", max: 10 },
                    { name: "Interaction Complexity", max: 10 },
                    { name: "Time Concentration", max: 10 },
                    { name: "Address Correlation", max: 10 },
                ],
                series: [
                    {
                        name: "Target Address",
                        data: [8, 7, 5, 6, 4],
                    },
                    {
                        name: "Normal Baseline",
                        data: [5, 5, 3, 4, 2],
                    },
                ],
                description: "Comparison of risk dimensions between target address and normal baseline",
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
                        message: "Radar chart generated and saved to charts/ directory",
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
