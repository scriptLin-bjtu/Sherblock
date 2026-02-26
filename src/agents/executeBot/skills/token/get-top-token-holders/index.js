/**
 * Get Top Token Holders Skill
 *
 * Gets the top token holders for a given token contract.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
    compressResponse,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TOP_TOKEN_HOLDERS",

    description: "Get the top token holders for a token contract",

    category: "token",

    params: {
        required: ["contractaddress"],
        optional: ["page", "offset"],
    },

    whenToUse: [
        "Analyzing token distribution",
        "Finding major token holders",
        "Whale tracking",
        "Token concentration analysis",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "token",
                action: "toptokenholders",
                chainId,
                apiKey,
                options: {
                    contractaddress: normalized.contractaddress,
                    page: normalized.page || "1",
                    offset: normalized.offset || "10",
                },
            });

            const data = await callEtherscanApi(url);

            // Compress if too large
            const result = compressResponse(data, {
                maxItems: 20,
                summaryFields: ["address", "balance", "share"],
            });

            return formatResult(result, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

