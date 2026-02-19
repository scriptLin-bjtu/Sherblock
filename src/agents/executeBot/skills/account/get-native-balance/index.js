/**
 * Get Native Balance Skill
 *
 * Gets the native token balance (ETH/MATIC/etc) for an address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_NATIVE_BALANCE",

    description:
        "Get the native token balance (ETH/MATIC/etc) for an address",

    category: "basic",

    params: {
        required: ["address"],
        optional: ["tag"],
    },

    whenToUse: [
        "Need to check address native token balance",
        "Analyzing address holdings",
        "Verifying funds before transaction analysis",
    ],

    async execute(params, context) {
        const { address, tag = "latest" } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "balance",
                chainId,
                apiKey,
                options: {
                    address,
                    tag,
                },
            });

            const data = await callEtherscanApi(url);

            // Etherscan returns balance in wei as a string
            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
