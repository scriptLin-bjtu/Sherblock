/**
 * Get Gas Estimate Skill
 *
 * Gets estimated confirmation time for a given gas price.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_GAS_ESTIMATE",

    description: "Get estimated confirmation time (in seconds) for a given gas price",

    category: "gas",

    params: {
        required: ["gasprice"],
        optional: [],
    },

    whenToUse: [
        "Need to estimate transaction confirmation time",
        "Planning transaction timing",
        "Comparing gas price vs confirmation time tradeoffs",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "gastracker",
                action: "gasestimate",
                chainId,
                apiKey,
                options: {
                    gasprice: normalized.gasprice,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

