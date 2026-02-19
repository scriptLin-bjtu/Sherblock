/**
 * Get Token Supply Skill
 *
 * Gets the total supply of an ERC20 token.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TOKEN_SUPPLY",

    description: "Get the total supply of an ERC20 token",

    category: "stats",

    params: {
        required: ["contractaddress"],
        optional: [],
    },

    whenToUse: [
        "Need token total supply",
        "Calculating market cap",
        "Tokenomics analysis",
    ],

    async execute(params, context) {
        const { contractaddress } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "stats",
                action: "tokensupply",
                chainId,
                apiKey,
                options: {
                    contractaddress,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
