/**
 * Get Transaction Logs Skill
 *
 * Gets event logs from a transaction by retrieving the transaction receipt.
 * This is more efficient than querying logs by address for a specific transaction.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TRANSACTION_LOGS",

    description: "Get event logs for a transaction by transaction hash. Retrieves the transaction receipt and extracts the logs field.",

    category: "transaction",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "Getting event logs for a specific transaction",
        "Analyzing smart contract interaction in a transaction",
        "Extracting events emitted during transaction execution",
        "When you have a transaction hash and need to see what events were emitted",
    ],

    async execute(params, context) {
        const { txhash } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            const url = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getTransactionReceipt",
                chainId,
                apiKey,
                options: {
                    txhash,
                },
            });

            const data = await callEtherscanApi(url);

            // Extract logs from the receipt
            const receipt = data.result || data;
            const logs = receipt.logs || [];

            // Provide a clear message about the logs
            let message = "";
            if (logs.length === 0) {
                message = "Transaction executed successfully but no event logs were emitted. This is normal for transactions that don't interact with contracts that emit events, or for simple value transfers.";
            } else {
                message = `Found ${logs.length} event log(s) emitted during this transaction execution.`;
            }

            // Format each log with key information
            const formattedLogs = logs.map(log => ({
                address: log.address,
                topics: log.topics,
                data: log.data,
                blockNumber: parseInt(log.blockNumber || "0", 16),
                transactionIndex: parseInt(log.transactionIndex || "0", 16),
                logIndex: parseInt(log.logIndex || "0", 16),
                removed: log.removed,
            }));

            return formatResult({
                transactionHash: txhash,
                logCount: logs.length,
                message,
                logs: formattedLogs,
            }, this.name);
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
