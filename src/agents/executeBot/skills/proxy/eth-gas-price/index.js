/**
 * ETH Gas Price Skill
 *
 * Gets the current gas price in wei via ETH RPC.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_GAS_PRICE",

    description: "Get the current gas price in wei via ETH RPC",

    category: "proxy",

    params: {
        required: [],
        optional: [],
    },

    whenToUse: [
        "Need current gas price",
        "Estimating transaction costs",
        "RPC-style gas price query",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_gasPrice",
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

