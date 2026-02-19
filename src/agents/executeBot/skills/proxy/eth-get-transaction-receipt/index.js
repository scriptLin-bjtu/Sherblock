/**
 * ETH Get Transaction Receipt Skill
 *
 * Gets transaction receipt by hash via ETH RPC proxy.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_GET_TRANSACTION_RECEIPT",

    description: "Get transaction receipt by hash via ETH RPC",

    category: "proxy",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Need transaction receipt",
        "Checking transaction status",
        "Analyzing gas used and logs",
    ],

    async execute(params, context) {
        const { txhash } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getTransactionReceipt",
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
