/**
 * Get Token Balance Skill
 *
 * Gets the ERC20 token balance for a specific address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TOKEN_BALANCE",

    description: "Get the ERC20 token balance for a specific address",

    category: "token",

    params: {
        required: ["contractaddress", "address"],
        optional: ["tag"],
    },

    whenToUse: [
        "Checking token balance for an address",
        "Analyzing token holdings",
        "Verifying token amounts",
    ],

    async execute(params, context) {
        const { contractaddress, address, tag = "latest" } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "account",
                action: "tokenbalance",
                chainId,
                apiKey,
                options: {
                    contractaddress,
                    address,
                    tag,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
