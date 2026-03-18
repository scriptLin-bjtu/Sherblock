/**
 * Get Proxy Implementation ABI Skill
 *
 * Gets the ABI for the implementation contract of a proxy contract.
 * This is useful when analyzing proxy contracts where the business logic
 * is in a separate implementation contract.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_IMPLEMENTATION_ABI",

    description: "Get the ABI for the implementation contract of a proxy contract",

    category: "contract",

    params: {
        required: ["proxyAddress"],
        optional: [],
    },

    whenToUse: [
        "Analyzing proxy contracts",
        "Decoding function calls on proxy contracts",
        "Getting business logic ABI from proxy contracts",
    ],

    async execute(params, context) {
        const { proxyAddress } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            // First, get the proxy contract source code to find the implementation address
            const proxyUrl = buildEtherscanUrl({
                module: "contract",
                action: "getsourcecode",
                chainId,
                apiKey,
                options: {
                    address: proxyAddress,
                },
            });

            const proxyData = await callEtherscanApi(proxyUrl);

            if (!proxyData.result || !proxyData.result[0]) {
                return formatError(
                    new Error("Failed to get proxy contract info"),
                    this.name
                );
            }

            const proxyInfo = proxyData.result[0];

            // Check if it's actually a proxy
            if (proxyInfo.Proxy !== "1") {
                return formatError(
                    new Error(
                        `${proxyAddress} is not a proxy contract. Use GET_CONTRACT_ABI instead.`
                    ),
                    this.name
                );
            }

            // Get the implementation address
            if (!proxyInfo.Implementation || proxyInfo.Implementation === "") {
                return formatError(
                    new Error(
                        `Implementation address not found for proxy contract ${proxyAddress}`
                    ),
                    this.name
                );
            }

            const implementationAddress = proxyInfo.Implementation;

            // Now get the implementation contract ABI
            const implUrl = buildEtherscanUrl({
                module: "contract",
                action: "getabi",
                chainId,
                apiKey,
                options: {
                    address: implementationAddress,
                },
            });

            const implData = await callEtherscanApi(implUrl);

            return formatResult(
                {
                    proxyAddress,
                    implementationAddress,
                    implementationContractName: proxyInfo.ContractName,
                    abi: implData.result || implData,
                },
                this.name
            );
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
