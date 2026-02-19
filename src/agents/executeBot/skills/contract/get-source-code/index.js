/**
 * Get Contract Source Code Skill
 *
 * Gets the source code for a verified contract.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_SOURCE_CODE",

    description: "Get the source code for a verified contract",

    category: "contract",

    params: {
        required: ["address"],
        optional: [],
    },

    whenToUse: [
        "Auditing a contract",
        "Analyzing contract logic",
        "Verifying contract functionality",
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

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
