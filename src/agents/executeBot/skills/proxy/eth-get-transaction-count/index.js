/**
 * ETH Get Transaction Count Skill
 *
 * Gets the number of transactions (nonce) for an address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_GET_TRANSACTION_COUNT",

    description: "Get the number of transactions (nonce) for an address",

    category: "proxy",

    params: {
        required: ["address"],
        optional: ["tag"],
    },

    whenToUse: [
        "Getting address nonce for transaction signing",
        "Checking transaction count",
        "Determining if address has sent transactions",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getTransactionCount",
                chainId,
                apiKey,
                options: {
                    address: normalized.address,
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

