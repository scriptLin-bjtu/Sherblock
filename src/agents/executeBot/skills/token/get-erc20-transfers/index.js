/**
 * Get ERC20 Transfers Skill
 *
 * Gets ERC20 token transfer events for an address.
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
    name: "GET_ERC20_TRANSFERS",

    description: "Get ERC20 token transfer events for an address",

    category: "token",

    params: {
        required: ["address"],
        optional: [
            "contractaddress",
            "startblock",
            "endblock",
            "page",
            "offset",
            "sort",
        ],
    },

    whenToUse: [
        "Analyzing token holdings and transfers",
        "Identifying DeFi activity",
        "Tracking specific token movements",
    ],

    async execute(params, context) {
        // Normalize parameter names (handle common LLM mistakes)
        const normalizedParams = normalizeParams(params);

        const {
            address,
            contractaddress,
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

            if (contractaddress) options.contractaddress = contractaddress;
            if (startblock !== undefined) options.startblock = startblock;
            if (endblock !== undefined) options.endblock = endblock;
            if (page !== undefined) options.page = page;
            if (offset !== undefined) options.offset = offset;

            const url = buildEtherscanUrl({
                module: "account",
                action: "tokentx",
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
                        ? `Showing ${data.result.length} transfers`
                        : undefined,
                },
            };
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
