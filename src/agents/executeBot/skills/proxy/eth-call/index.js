/**
 * ETH Call Skill
 *
 * Executes a read-only contract call without creating a transaction.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_CALL",

    description: "Execute a read-only contract call without creating a transaction",

    category: "proxy",

    params: {
        required: ["to", "data"],
        optional: ["tag"],
    },

    whenToUse: [
        "Reading contract state without transaction",
        "Calling view/pure functions",
        "Getting contract data",
        "Simulating contract calls",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_call",
                chainId,
                apiKey,
                options: {
                    to: normalized.to,
                    data: normalized.data,
                    tag: normalized.tag || "latest",
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

