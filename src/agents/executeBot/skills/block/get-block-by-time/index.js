/**
 * Get Block By Time Skill
 *
 * Gets the block number closest to a given timestamp.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_BLOCK_BY_TIME",

    description: "Get the block number closest to a given Unix timestamp",

    category: "block",

    params: {
        required: ["timestamp"],
        optional: ["closest"],
    },

    whenToUse: [
        "Finding block number for a specific date/time",
        "Historical data queries by time",
        "Converting timestamp to block number",
        "Time-based blockchain analysis",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "block",
                action: "getblocknobytime",
                chainId,
                apiKey,
                options: {
                    timestamp: normalized.timestamp,
                    closest: normalized.closest || "before",
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

