/**
 * Get Contract ABI Skill
 *
 * Gets the ABI (Application Binary Interface) for a verified contract.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_CONTRACT_ABI",

    description: "Get the ABI for a verified contract",

    category: "contract",

    params: {
        required: ["address"],
        optional: [],
    },

    whenToUse: [
        "Need to interact with a contract",
        "Decoding contract calls",
        "Analyzing contract functions",
    ],

    async execute(params, context) {
        const { address } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "contract",
                action: "getabi",
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
