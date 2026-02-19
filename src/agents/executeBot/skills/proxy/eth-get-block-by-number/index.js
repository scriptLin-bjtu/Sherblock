/**
 * ETH Get Block By Number Skill
 *
 * Gets block data by block number via ETH RPC proxy.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_GET_BLOCK_BY_NUMBER",

    description: "Get block data by block number via ETH RPC",

    category: "proxy",

    params: {
        required: ["tag"],
        optional: ["boolean"],
    },

    whenToUse: [
        "Need block details",
        "Analyzing block contents",
        "Getting block transactions",
    ],

    async execute(params, context) {
        const { tag, boolean = true } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getBlockByNumber",
                chainId,
                apiKey,
                options: {
                    tag,
                    boolean,
                },
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
