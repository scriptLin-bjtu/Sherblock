/**
 * Get Logs Skill
 *
 * Gets event logs for an address with optional topic filtering.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_LOGS",

    description: "Get event logs for an address with optional topic filtering",

    category: "logs",

    params: {
        required: ["address"],
        optional: [
            "fromBlock",
            "toBlock",
            "topic0",
            "topic1",
            "topic2",
            "topic3",
            "topic0_1_opr",
            "topic0_2_opr",
            "topic0_3_opr",
            "topic1_2_opr",
            "topic1_3_opr",
            "topic2_3_opr",
        ],
    },

    whenToUse: [
        "Monitoring contract events",
        "Tracking specific event signatures",
        "Analyzing contract activity",
    ],

    async execute(params, context) {
        const {
            address,
            fromBlock,
            toBlock,
            topic0,
            topic1,
            topic2,
            topic3,
            topic0_1_opr,
            topic0_2_opr,
            topic0_3_opr,
            topic1_2_opr,
            topic1_3_opr,
            topic2_3_opr,
        } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const options = {
                address,
            };

            if (fromBlock !== undefined) options.fromBlock = fromBlock;
            if (toBlock !== undefined) options.toBlock = toBlock;
            if (topic0 !== undefined) options.topic0 = topic0;
            if (topic1 !== undefined) options.topic1 = topic1;
            if (topic2 !== undefined) options.topic2 = topic2;
            if (topic3 !== undefined) options.topic3 = topic3;
            if (topic0_1_opr !== undefined) options.topic0_1_opr = topic0_1_opr;
            if (topic0_2_opr !== undefined) options.topic0_2_opr = topic0_2_opr;
            if (topic0_3_opr !== undefined) options.topic0_3_opr = topic0_3_opr;
            if (topic1_2_opr !== undefined) options.topic1_2_opr = topic1_2_opr;
            if (topic1_3_opr !== undefined) options.topic1_3_opr = topic1_3_opr;
            if (topic2_3_opr !== undefined) options.topic2_3_opr = topic2_3_opr;

            const url = buildEtherscanUrl({
                module: "logs",
                action: "getLogs",
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
