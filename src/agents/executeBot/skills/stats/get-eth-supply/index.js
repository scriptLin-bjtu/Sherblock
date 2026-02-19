/**
 * Get ETH Supply Skill
 *
 * Gets the current total ETH supply.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_ETH_SUPPLY",

    description: "Get the current total ETH supply",

    category: "stats",

    params: {
        required: [],
        optional: [],
    },

    whenToUse: [
        "Need total ETH supply",
        "Analyzing tokenomics",
        "Market research",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "stats",
                action: "ethsupply",
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
