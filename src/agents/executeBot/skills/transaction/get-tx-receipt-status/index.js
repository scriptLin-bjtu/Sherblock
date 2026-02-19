/**
 * Get Transaction Receipt Status Skill
 *
 * Gets the receipt status of a transaction.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TX_RECEIPT_STATUS",

    description: "Get the receipt status of a transaction",

    category: "transaction",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Checking if transaction succeeded",
        "Verifying transaction status",
        "Confirming transaction finality",
    ],

    async execute(params, context) {
        const { txhash } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "transaction",
                action: "gettxreceiptstatus",
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
