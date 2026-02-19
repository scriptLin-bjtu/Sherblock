/**
 * Get ERC1155 Transfers Skill
 *
 * Gets ERC1155 token transfer events for an address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_ERC1155_TRANSFERS",

    description: "Get ERC1155 token transfer events for an address",

    category: "token",

    params: {
        required: ["address"],
        optional: [
            "contractaddress",
            "startblock",
            "endblock",
            "page",
            "offset",
            "sort",
        ],
    },

    whenToUse: [
        "Analyzing ERC1155 token holdings",
        "Tracking multi-token transfers",
        "Monitoring NFT/GameFi activity",
    ],

    async execute(params, context) {
        const {
            address,
            contractaddress,
            startblock,
            endblock,
            page,
            offset,
            sort = "desc",
        } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const options = {
                address,
                sort,
            };

            if (contractaddress) options.contractaddress = contractaddress;
            if (startblock !== undefined) options.startblock = startblock;
            if (endblock !== undefined) options.endblock = endblock;
            if (page !== undefined) options.page = page;
            if (offset !== undefined) options.offset = offset;

            const url = buildEtherscanUrl({
                module: "account",
                action: "token1155tx",
                chainId,
                apiKey,
                options,
            });

            const data = await callEtherscanApi(url);

            return formatResult(data, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
