/**
 * Get Transactions Skill
 *
 * Gets the list of normal transactions for an address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    compressResponse,
    summarizeTransactions,
} from "../../lib/etherscan-client.js";

/**
 * Normalize parameter names from common LLM mistakes
 * Maps wrong parameter names to correct Etherscan API names
 */
function normalizeParams(params) {
    const normalized = { ...params };
    const nameMapping = {
        // Block range parameters
        start_block: "startblock",
        startBlock: "startblock",
        start: "startblock",
        end_block: "endblock",
        endBlock: "endblock",
        end: "endblock",
        // Pagination parameters
        limit: "offset",
        per_page: "offset",
        perPage: "offset",
    };

    for (const [wrong, correct] of Object.entries(nameMapping)) {
        if (wrong in normalized && !(correct in normalized)) {
            normalized[correct] = normalized[wrong];
            delete normalized[wrong];
        }
    }

    return normalized;
}

export default {
    name: "GET_TRANSACTIONS",

    description: "Get list of normal transactions for an address",

    category: "basic",

    params: {
        required: ["address"],
        optional: ["startblock", "endblock", "page", "offset", "sort"],
    },

    whenToUse: [
        "Analyzing address transaction history",
        "Finding transaction patterns",
        "Identifying counterparties",
        "Building transaction timeline",
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

        console.log("Get Transactions Skill: ", normalizedParams);
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
                action: "txlist",
                chainId,
                apiKey,
                options,
            });

            const data = await callEtherscanApi(url);

            // Compress the result to prevent context overflow
            // For transaction arrays, use smart summarization
            let processedResult;
            if (data.result && Array.isArray(data.result) && data.result.length > 0) {
                processedResult = summarizeTransactions(data.result, 50);
            } else {
                processedResult = compressResponse(data.result, 500);
            }

            return {
                type: "OBSERVATION",
                content: {
                    skill: this.name,
                    success: true,
                    data: processedResult,
                    note: data.result?.length > 50 ? "Showing first 50 transactions only" : undefined,
                },
            };
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
