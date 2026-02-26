/**
 * Get Gas Oracle Skill
 *
 * Gets the current gas prices (safe, proposed, fast) from the gas tracker.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_GAS_ORACLE",

    description: "Get current gas prices (safe, proposed, fast) from gas tracker",

    category: "gas",

    params: {
        required: [],
        optional: [],
    },

    whenToUse: [
        "Need current gas prices",
        "Estimating transaction costs",
        "Choosing optimal gas price for transaction",
        "Monitoring network congestion",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "gastracker",
                action: "gasoracle",
                chainId,
                apiKey,
                options: {},
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};

