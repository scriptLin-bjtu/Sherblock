/**
 * Get Internal Transactions Skill
 *
 * Gets the list of internal transactions for an address.
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
    name: "GET_INTERNAL_TRANSACTIONS",

    description: "Get the list of internal transactions for an address",

    category: "account",

    params: {
        required: ["address"],
        optional: ["startblock", "endblock", "page", "offset", "sort"],
    },

    whenToUse: [
        "Analyzing internal transaction history",
        "Tracking contract interactions",
        "Finding ETH transfers via contract calls",
    ],

    async execute(params, context) {
        // Normalize parameter names (handle common LLM mistakes)
        const normalizedParams = normalizeParams(params);

        const {
            address,
            startblock,
            endblock,
            page,
            offset,
            sort = "desc",
        } = normalizedParams;
        const { apiKey, chainId = "1" } = context;

        try {
            const options = {
                address,
                sort,
            };

            if (startblock !== undefined) options.startblock = startblock;
            if (endblock !== undefined) options.endblock = endblock;
            if (page !== undefined) options.page = page;
            if (offset !== undefined) options.offset = offset;

            const url = buildEtherscanUrl({
                module: "account",
                action: "txlistinternal",
                chainId,
                apiKey,
                options,
            });

            const data = await callEtherscanApi(url);

            // Compress the result to prevent context overflow
            const compressedResult = compressResponse(data.result, 500);

            return {
                type: "OBSERVATION",
                content: {
                    skill: this.name,
                    success: true,
                    data: compressedResult,
                    note: Array.isArray(data.result) && data.result.length > 50
                        ? `Showing ${data.result.length} transactions`
                        : undefined,
                },
            };
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
