/**
 * Get Transaction Status Skill
 *
 * Gets the execution status of a transaction (error status and error message).
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TX_STATUS",

    description: "Get the execution status of a transaction (error status and message if failed)",

    category: "transaction",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Checking if a transaction executed successfully",
        "Getting error message for failed transaction",
        "Debugging transaction failures",
        "Transaction monitoring",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "transaction",
                action: "getstatus",
                chainId,
                apiKey,
                options: {
                    txhash: normalized.txhash,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

