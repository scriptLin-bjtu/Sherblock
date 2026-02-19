/**
 * Get ETH Price Skill
 *
 * Gets the current ETH price in USD and BTC.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_ETH_PRICE",

    description: "Get the current ETH price in USD and BTC",

    category: "stats",

    params: {
        required: [],
        optional: [],
    },

    whenToUse: [
        "Need current ETH price",
        "Calculating portfolio value",
        "Market analysis",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "stats",
                action: "ethprice",
                chainId,
                apiKey,
                options: {},
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
