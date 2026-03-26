/**
 * Get Transaction Call Info Skill
 *
 * Get detailed information about a transaction's contract call. Use this when the user
 * provides a transaction hash and wants to know which function was called and what parameters
 * were passed. Automatically fetches transaction details and contract ABI from Etherscan,
 * then decodes the function name and parameters. Handles proxy contracts automatically.
 */

import { ethers } from "ethers";
import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_TRANSACTION_CALL_INFO",

    description:
        "Decode a transaction's contract call to get function name and parameters. Use this when user provides a transaction hash and wants to understand what function was called and what parameters were passed. Automatically fetches contract ABI and handles proxy contracts. This is the PRIMARY skill for analyzing transaction calls.",

    category: "transaction",

    params: {
        required: ["txhash"],
        optional: [],
    },

    whenToUse: [
        "User provided a transaction hash and wants to know what function was called",
        "Need to analyze a specific transaction's contract call details",
        "Want to understand what parameters were passed in a transaction",
        "Need to decode transaction input data to human-readable format",
        "PRIMARY skill for analyzing transaction calls - use this first when transaction hash is provided",
        "CAUTION: Do NOT use when user only has contract address - use GET_CONTRACT_ABI instead",
    ],

    async execute(params, context) {
        const { txhash } = params;
        const { apiKey, chainId = "1" } = context;

        let tx = null;
        let contractAddress = null;
        let input = null;
        let abi = null;
        let abiSource = null;
        let isProxy = false;
        let implementationAddress = null;

        try {
            // 1. Fetch transaction details
            const txUrl = buildEtherscanUrl({
                module: "proxy",
                action: "eth_getTransactionByHash",
                chainId,
                apiKey,
                options: {
                    txhash,
                },
            });

            const txData = await callEtherscanApi(txUrl);

            if (!txData.result) {
                const errorDetails = {
                    reason: "TRANSACTION_NOT_FOUND",
                    txhash,
                    chainId,
                    message: `Transaction ${txhash} not found on chain ${chainId}`,
                    suggestions: [
                        "Check if the transaction hash is correct",
                        "Verify the transaction was included in a block",
                        "Check if the chain ID is correct",
                    ],
                };
                return formatError(
                    new Error(JSON.stringify(errorDetails, null, 2)),
                    this.name,
                );
            }

            tx = txData.result;
            input = tx.input || "0x";
            contractAddress = tx.to;

            // 2. Check if this is a contract call
            if (input === "0x" || input.length <= 10) {
                return formatResult(
                    {
                        txhash,
                        chainId,
                        type: "simple_transfer",
                        note: "This is not a contract call. The input data is empty or too short.",
                        transaction: {
                            from: tx.from,
                            to: tx.to,
                            value: tx.value,
                            gas: tx.gas,
                            gasPrice: tx.gasPrice,
                        },
                    },
                    this.name,
                );
            }

            // 3. Fetch ABI (if not manually provided)
            if (
                !abi &&
                contractAddress &&
                contractAddress !== "0x0000000000000000000000000000000000000000"
            ) {
                // First check if it's a proxy contract
                const isProxyInfo = await this.checkIsProxy(
                    contractAddress,
                    chainId,
                    apiKey,
                );
                isProxy = isProxyInfo.isProxy;
                implementationAddress = isProxyInfo.implementationAddress;

                if (isProxy && implementationAddress) {
                    // Is proxy contract, fetch implementation contract's ABI
                    abi = await this.getContractABI(
                        implementationAddress,
                        chainId,
                        apiKey,
                    );
                    abiSource = "proxy_implementation";
                } else {
                    // Not proxy contract, fetch ABI directly
                    abi = await this.getContractABI(
                        contractAddress,
                        chainId,
                        apiKey,
                    );
                    abiSource = "etherscan";
                }
            }

            if (!abi) {
                // Build detailed error message
                const errorDetails = {
                    reason: "ABI_NOT_FOUND",
                    txhash,
                    chainId,
                    contractAddress,
                    isProxy,
                    implementationAddress,
                    methodSelector: input.slice(0, 10),
                    inputLength: input.length,
                    suggestions: [],
                };

                if (isProxy) {
                    if (!implementationAddress) {
                        errorDetails.reason = "PROXY_NO_IMPLEMENTATION";
                        errorDetails.message =
                            "Contract is a proxy but implementation address could not be determined from Etherscan.";
                        errorDetails.suggestions.push(
                            "Check if proxy contract uses a different storage slot for implementation",
                        );
                    } else {
                        errorDetails.reason = "PROXY_ABI_NOT_FOUND";
                        errorDetails.message = `Proxy contract detected, but implementation contract (${implementationAddress}) is not verified on Etherscan.`;
                        errorDetails.suggestions.push(
                            "Verify implementation contract source code on Etherscan",
                        );
                    }
                } else {
                    errorDetails.message = `Contract (${contractAddress}) is not verified on Etherscan or has no source code available.`;
                    errorDetails.suggestions.push(
                        "Verify contract source code on Etherscan",
                    );
                }

                errorDetails.suggestions.push(
                    "Verify the contract on Etherscan to make ABI available",
                );

                return formatError(
                    new Error(JSON.stringify(errorDetails, null, 2)),
                    this.name,
                );
            }

            // 4. Parse ABI
            const parsedAbi = this.parseAbi(abi);

            // 5. Decode contract call
            const iface = new ethers.utils.Interface(parsedAbi);
            const parsedTx = iface.parseTransaction({ data: input });

            // 6. Format result
            const result = {
                txhash,
                chainId,
                type: "contract_call",
                contractAddress,
                abiSource,
                function: {
                    name: parsedTx.name,
                    signature: parsedTx.signature,
                },
                parameters: this.formatParameters(
                    parsedTx.args,
                    parsedTx.functionFragment.inputs,
                ),
                transaction: {
                    from: tx.from,
                    to: tx.to,
                    value: this.formatValue(BigInt(tx.value || "0")),
                    gas: tx.gas,
                    gasPrice: this.formatValue(BigInt(tx.gasPrice || "0")),
                    nonce: tx.nonce,
                },
                raw: {
                    methodId: input.slice(0, 10),
                    inputLength: input.length,
                },
            };

            return formatResult(result, this.name);
        } catch (error) {
            // Build detailed error message
            const errorDetails = {
                reason: "DECODE_FAILED",
                txhash,
                chainId,
                contractAddress,
                abiSource,
                message: error.message,
                code: error.code,
            };

            // Add more context
            if (input) {
                errorDetails.methodSelector = input.slice(0, 10);
                errorDetails.inputLength = input.length;
            }

            if (
                error.code === "INVALID_ARGUMENT" ||
                error.code === "CALL_EXCEPTION"
            ) {
                errorDetails.reason = "ABI_MISMATCH";
                errorDetails.message =
                    "Failed to decode contract call with the provided ABI.";
                errorDetails.suggestions = [
                    "The ABI may not contain the function being called",
                    "Function signature may have changed/updated",
                    isProxy
                        ? "The contract is a proxy - you may need to provide the implementation ABI"
                        : null,
                    "Try providing a different or updated ABI from contract source code",
                ].filter(Boolean);
            } else if (
                error.message &&
                (error.message.includes("API key") ||
                    error.message.includes("Invalid API Key"))
            ) {
                errorDetails.reason = "API_KEY_ERROR";
                errorDetails.message = "Invalid or missing Etherscan API key.";
                errorDetails.suggestions = [
                    "Check your ETHERSCAN_API_KEY environment variable",
                    "Verify your API key is valid and has access to the specified chain",
                ];
            }

            return formatError(
                new Error(JSON.stringify(errorDetails, null, 2)),
                this.name,
            );
        }
    },

    /**
     * Check if contract is a proxy contract
     */
    async checkIsProxy(address, chainId, apiKey) {
        try {
            const url = buildEtherscanUrl({
                module: "contract",
                action: "getsourcecode",
                chainId,
                apiKey,
                options: { address },
            });

            const data = await callEtherscanApi(url);

            if (data.result && data.result[0]) {
                const info = data.result[0];
                return {
                    isProxy: info.Proxy === "1",
                    implementationAddress: info.Implementation || null,
                    contractName: info.ContractName || null,
                };
            }

            return { isProxy: false, implementationAddress: null };
        } catch {
            return { isProxy: false, implementationAddress: null };
        }
    },

    /**
     * Fetch contract ABI from Etherscan
     */
    async getContractABI(address, chainId, apiKey) {
        const url = buildEtherscanUrl({
            module: "contract",
            action: "getabi",
            chainId,
            apiKey,
            options: { address },
        });

        const data = await callEtherscanApi(url);
        return data.result || data;
    },

    parseAbi(abi) {
        try {
            if (typeof abi === "string") {
                return JSON.parse(abi);
            } else if (Array.isArray(abi)) {
                return abi;
            } else {
                throw new Error("ABI must be a JSON string or array");
            }
        } catch (error) {
            throw new Error(`Failed to parse ABI: ${error.message}`);
        }
    },

    formatParameters(args, inputs) {
        const formatted = [];

        args.forEach((arg, index) => {
            if (index >= inputs.length) {
                return;
            }

            const input = inputs[index];
            const param = {
                name: input.name || `arg${index}`,
                type: input.type,
                value: this.formatValue(arg, input.type),
            };

            if (input.baseType) {
                param.baseType = input.baseType;
            }

            formatted.push(param);
        });

        return formatted;
    },

    formatValue(value, type = null) {
        if (value === null || value === undefined) {
            return null;
        }

        // Handle BigInt (used for value and gasPrice)
        if (typeof value === "bigint") {
            const wei = value.toString();
            const eth = value / BigInt(1e18);
            return {
                wei,
                eth: eth.toString(),
                ethNumber: Number(eth),
            };
        }

        // Handle ethers BigNumber
        if (ethers.BigNumber.isBigNumber(value)) {
            return {
                hex: value.toHexString(),
                number: value.toString(),
                decimal: value.toNumber(),
            };
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map((item) => this.formatValue(item));
        }

        // Handle objects (structs)
        if (typeof value === "object" && value !== null) {
            const formatted = {};
            for (const [key, val] of Object.entries(value)) {
                formatted[key] = this.formatValue(val);
            }
            return formatted;
        }

        // Handle hex strings (try to decode to readable text)
        if (typeof value === "string" && value.startsWith("0x")) {
            return this.decodeHexString(value, type);
        }

        return value;
    },

    /**
     * Decode hex string to readable text
     */
    decodeHexString(hex, type = null) {
        // Try to decode to text for bytes and bytes32 types
        const shouldDecode = type === "bytes" || type === "bytes32";
        if (!shouldDecode) {
            return hex;
        }

        const result = { hex };

        try {
            // Skip '0x' prefix
            const hexData = hex.slice(2);

            // Convert to Buffer and try to decode
            const buffer = Buffer.from(hexData, "hex");
            const decoded = buffer.toString("utf8");

            // Remove trailing nulls first
            const trimmed = decoded.replace(/\x00+$/g, "");

            // Check if decoding was successful (contains valid text)
            const hasPrintableChars = /[a-zA-Z0-9]/.test(trimmed);

            // Calculate control character ratio (based on string after removing nulls)
            const controlCharRatio =
                trimmed.length > 0
                    ? (trimmed.match(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || [])
                          .length / trimmed.length
                    : 1;

            if (
                hasPrintableChars &&
                controlCharRatio < 0.5 &&
                trimmed.length > 0
            ) {
                result.text = trimmed;
            }
        } catch {
            // Decoding failed, only return hex
        }

        // If only hex and no text, return original string directly
        return result.text ? result : hex;
    },
};
