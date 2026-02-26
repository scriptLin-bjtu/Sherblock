/**
 * Get Token Info Skill
 *
 * Gets detailed token information including name, symbol, decimals, etc.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TOKEN_INFO",

    description: "Get detailed token information (name, symbol, decimals, total supply, etc.)",

    category: "token",

    params: {
        required: ["contractaddress"],
        optional: [],
    },

    whenToUse: [
        "Need token details like name, symbol, decimals",
        "Verifying token contract information",
        "Getting token metadata",
        "Token research and analysis",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "token",
                action: "tokeninfo",
                chainId,
                apiKey,
                options: {
                    contractaddress: normalized.contractaddress,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

