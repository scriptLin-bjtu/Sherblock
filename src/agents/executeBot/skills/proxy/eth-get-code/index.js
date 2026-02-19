/**
 * ETH Get Code Skill
 *
 * Gets the bytecode at a given address via ETH RPC proxy.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "ETH_GET_CODE",

    description: "Get the bytecode at a given address via ETH RPC",

    category: "proxy",

    params: {
        required: ["address"],
        optional: ["tag"],
    },

    whenToUse: [
        "Checking if address is a contract",
        "Verifying contract bytecode",
        "Analyzing contract deployment",
    ],

    async execute(params, context) {
        const { address, tag = "latest" } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getCode",
                chainId,
                apiKey,
                options: {
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
