/**
 * Get Address Token Balance Skill
 *
 * Gets all ERC20 token balances for an address (portfolio view).
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
    name: "GET_ADDRESS_TOKEN_BALANCE",

    description: "Get all ERC20 token balances for an address (address portfolio)",

    category: "token",

    params: {
        required: ["address"],
        optional: ["page", "offset"],
    },

    whenToUse: [
        "Getting complete token portfolio for an address",
        "Analyzing address holdings",
        "Portfolio value calculation",
        "Multi-token balance check",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "addresstokenbalance",
                chainId,
                apiKey,
                options: {
                    address: normalized.address,
                    page: normalized.page || "1",
                    offset: normalized.offset || "100",
                },
            });

            const data = await callEtherscanApi(url);

            // Compress if too large
            const result = compressResponse(data, {
                maxItems: 50,
                summaryFields: ["TokenAddress", "TokenName", "TokenSymbol", "TokenQuantity"],
            });

            return formatResult(result, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

