/**
 * Get Contract ABI Skill
 *
 * Gets the ABI (Application Binary Interface) for a verified contract.
 * If the contract is a proxy, automatically returns the implementation ABI.
 */

import {
    buildEtherscanUrl,
    callEtherscanApi,
    formatResult,
    formatError,
} from "../../lib/etherscan-client.js";

export default {
    name: "GET_CONTRACT_ABI",

    description: "Get the ABI for a verified contract. Automatically returns implementation ABI if contract is a proxy.",

    category: "contract",

    params: {
        required: ["address"],
        optional: ["getImplementationOnly"], // If true, skip proxy ABI and go straight to implementation
    },

    whenToUse: [
        "Need to interact with a contract",
        "Decoding contract calls",
        "Analyzing contract functions",
        "Getting ABI for proxy contracts",
    ],

    async execute(params, context) {
        const { address, getImplementationOnly = false } = params;
        const { apiKey, chainId = "1" } = context;

        try {
            // First, check if this is a proxy contract by getting source code
            const sourceCodeUrl = buildEtherscanUrl({
                module: "contract",
                action: "getsourcecode",
                chainId,
                apiKey,
                options: {
                    address,
                },
            });

            const sourceCodeData = await callEtherscanApi(sourceCodeUrl);

            if (!sourceCodeData.result || !sourceCodeData.result[0]) {
                return formatError(
                    new Error("Failed to get contract source code"),
                    this.name
                );
            }

            const contractInfo = sourceCodeData.result[0];

            // Check if it's a proxy contract
            const isProxy = contractInfo.Proxy === "1";

            if (isProxy) {
                // It's a proxy contract
                if (!contractInfo.Implementation || contractInfo.Implementation === "") {
                    // Proxy but no implementation address found
                    return formatError(
                        new Error(
                            `Contract ${address} is a proxy but implementation address not found`
                        ),
                        this.name
                    );
                }

                const implementationAddress = contractInfo.Implementation;

                // Get the implementation contract ABI
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
                        address,
                        contractName: contractInfo.ContractName,
                        isProxy: true,
                        proxyAddress: address,
                        implementationAddress,
                        implementationContractName: contractInfo.ContractName, // Note: this is the proxy's contract name
                        abi: implData.result || implData,
                        note: "This is a proxy contract. The returned ABI is from the implementation contract.",
                    },
                    this.name
                );
            } else {
                // Not a proxy contract, get its ABI directly
                const url = buildEtherscanUrl({
                    module: "contract",
                    action: "getabi",
                    chainId,
                    apiKey,
                    options: {
                        address,
                    },
                });

                const data = await callEtherscanApi(url);

                return formatResult(
                    {
                        address,
                        contractName: contractInfo.ContractName,
                        isProxy: false,
                        abi: data.result || data,
                    },
                    this.name
                );
            }
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};
