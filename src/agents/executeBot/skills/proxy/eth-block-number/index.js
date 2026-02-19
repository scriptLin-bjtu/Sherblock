/**
 * ETH Block Number Skill
 *
 * Gets the latest block number via ETH RPC proxy.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_BLOCK_NUMBER",

    description: "Get the latest block number via ETH RPC",

    category: "proxy",

    params: {
        required: [],
        optional: [],
    },

    whenToUse: [
        "Need current block number",
        "Tracking chain height",
        "Block-based time calculations",
    ],

    async execute(params, context) {
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_blockNumber",
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
