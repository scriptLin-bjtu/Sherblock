/**
 * Get Address Tag Skill
 *
 * Gets the name tag and labels associated with an address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
    normalizeParams,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_ADDRESS_TAG",

    description: "Get the name tag and labels associated with an address (e.g., 'Coinbase 10')",

    category: "nametag",

    params: {
        required: ["address"],
        optional: [],
    },

    whenToUse: [
        "Identifying known addresses (exchanges, protocols, etc.)",
        "Getting human-readable address labels",
        "Address attribution and identification",
        "Compliance and investigation",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;
        const normalized = normalizeParams(params);

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "getaddresstag",
                chainId,
                apiKey,
                options: {
                    address: normalized.address,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

