/**
 * Get Funded By Skill
 *
 * Gets the funding source of an address (the address that first funded it).
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_FUNDED_BY",

    description: "Get the funding source (first funder) of an address",

    category: "account",

    params: {
        required: ["address"],
        optional: [],
    },

    whenToUse: [
        "Tracing the origin of funds for an address",
        "Investigating address funding history",
        "Compliance and AML analysis",
        "Understanding address relationships",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "fundedby",
                chainId,
                apiKey,
                options: {
                    address: normalized.address,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

