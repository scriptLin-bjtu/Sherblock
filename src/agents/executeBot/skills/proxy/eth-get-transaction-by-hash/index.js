/**
 * ETH Get Transaction By Hash Skill
 *
 * Gets transaction data by hash via ETH RPC proxy.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_GET_TRANSACTION_BY_HASH",

    description: "Get transaction data by hash via ETH RPC",

    category: "proxy",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Need transaction details",
        "Analyzing transaction data",
        "Getting raw transaction info",
    ],

    async execute(params, context) {
        const { txhash } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getTransactionByHash",
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
