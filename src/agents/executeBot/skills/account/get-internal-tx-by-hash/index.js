/**
 * Get Internal Transactions By Hash Skill
 *
 * Gets the list of internal transactions for a specific transaction hash.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_INTERNAL_TX_BY_HASH",

    description: "Get the list of internal transactions for a specific transaction hash",

    category: "transaction",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Analyzing internal calls within a transaction",
        "Tracking ETH transfers via contract calls",
        "Debugging transaction execution",
    ],

    async execute(params, context) {
        const { txhash } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "txlistinternal",
                chainId,
                apiKey,
                options: {
                    txhash,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
