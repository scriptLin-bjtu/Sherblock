/**
 * Get Contract Creator Skill
 *
 * Gets the creator address and creation transaction for a contract.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_CONTRACT_CREATOR",

    description: "Get the creator address and creation transaction for a contract",

    category: "contract",

    params: {
        required: ["contractaddresses"],
        optional: [],
    },

    whenToUse: [
        "Identifying who deployed a contract",
        "Finding the creation transaction",
        "Analyzing contract deployment",
    ],

    async execute(params, context) {
        const { contractaddresses } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "contract",
                action: "getcontractcreation",
                chainId,
                apiKey,
                options: {
                    contractaddresses,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
