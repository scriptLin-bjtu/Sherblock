/**
 * Get Internal Transactions by Transaction Hash Skill
 *
 * Gets the list of internal transactions for a specific transaction hash.
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
    name: "GET_INTERNAL_TX_BY_HASH",

    description:
        "Get the list of internal transactions for a specific transaction hash",

    category: "transaction",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Analyzing internal calls within a transaction",
        "Tracking ETH transfers via contract calls in a specific transaction",
        "Debugging contract interactions",
        "Understanding transaction execution flow",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "txlistinternal",
                chainId,
                apiKey,
                options: {
                    txhash: normalized.txhash,
                },
            });

            const data = await callEtherscanApi(url);

            // Compress the result to prevent context overflow
            const compressedResult = compressResponse(data.result, {
                maxItems: 50,
                summaryFields: [
                    "from",
                    "to",
                    "value",
                    "type",
                    "isError",
                ],
            });

            return formatResult(
                {
                    ...data,
                    result: compressedResult,
                },
                this.name
            );
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

