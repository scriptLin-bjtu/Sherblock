/**
 * Get ERC721 Transfers Skill
 *
 * Gets ERC721 (NFT) token transfer events for an address.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_ERC721_TRANSFERS",

    description: "Get ERC721 (NFT) token transfer events for an address",

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
        "Analyzing NFT holdings and transfers",
        "Tracking NFT collection activity",
        "Identifying NFT trading patterns",
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
                action: "tokennfttx",
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
