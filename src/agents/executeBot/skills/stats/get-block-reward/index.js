/**
 * Get Block Reward Skill
 *
 * Gets the block reward and uncle rewards for a given block.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_BLOCK_REWARD",

    description: "Get the block reward and uncle rewards for a given block",

    category: "stats",

    params: {
        required: ["blockno"],
        optional: [],
    },

    whenToUse: [
        "Analyzing miner rewards",
        "Calculating block incentives",
        "Mining analytics",
    ],

    async execute(params, context) {
        const { blockno } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "block",
                action: "getblockreward",
                chainId,
                apiKey,
                options: {
                    blockno,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
