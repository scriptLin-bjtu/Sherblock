/**
 * Get Contract Source Code Skill
 *
 * Gets the source code for a verified contract.
 * If the contract is a proxy, the response includes:
 * - Proxy: "1" (is proxy) or "0" (not proxy)
 * - Implementation: The implementation contract address (if proxy)
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_SOURCE_CODE",

    description: "Get the source code for a verified contract. Includes proxy info (Proxy field and Implementation address) if contract is a proxy.",

    category: "contract",

    params: {
        required: ["address"],
        optional: [],
    },

    whenToUse: [
        "Auditing a contract",
        "Analyzing contract logic",
        "Verifying contract functionality",
        "Checking if contract is a proxy",
        "Getting implementation contract address",
    ],

    async execute(params, context) {
        const { address } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "contract",
                action: "getsourcecode",
                chainId,
                apiKey,
                options: {
                    address,
                },
            });

            const data = await callEtherscanApi(url);

            // If this is a proxy, add a note to help users
            if (data.result && data.result[0] && data.result[0].Proxy === "1") {
                const result = { ...data };
                result.proxyNote = "This is a proxy contract. Use GET_CONTRACT_ABI to automatically get the implementation contract's ABI, or GET_SOURCE_CODE result.Implementation to get the implementation address.";
                return formatResult(result, this.name);
            }

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
