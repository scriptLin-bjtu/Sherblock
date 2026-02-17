/**
 * Etherscan API Skills for Blockchain Analysis
 * Based on Etherscan V2 API documentation
 * Supports multi-chain through chainid parameter
 */

// Supported chains with their chain IDs
export const SUPPORTED_CHAINS = {
    ethereum: "1",
    polygon: "137",
    bsc: "56",
    arbitrum: "42161",
    optimism: "10",
    base: "8453",
    avalanche: "43114",
    linea: "59144",
    blast: "81457",
    scroll: "534352",
    gnosis: "100",
    celo: "42220",
    moonbeam: "1284",
    // Add testnets as needed
    sepolia: "11155111",
    polygon_amoy: "80002",
};

/**
 * Skill categories for progressive analysis
 */
export const SKILL_CATEGORIES = {
    BASIC: "basic", // Fundamental queries (balance, tx list)
    TRANSACTION: "transaction", // Transaction analysis
    TOKEN: "token", // Token-related queries
    CONTRACT: "contract", // Contract analysis
    LOGS: "logs", // Event logs
    STATS: "stats", // Network statistics
    PROXY: "proxy", // Geth/Parity proxy
};

/**
 * Base API URL for Etherscan V2
 */
export const BASE_URL = "https://api.etherscan.io/v2/api";

/**
 * Blockchain Analysis Skills
 */
export const SKILLS = {
    // ==================== ACCOUNT SKILLS ====================
    GET_NATIVE_BALANCE: {
        name: "GET_NATIVE_BALANCE",
        description:
            "Get the native token balance (ETH/MATIC/etc) for an address",
        category: SKILL_CATEGORIES.BASIC,
        module: "account",
        action: "balance",
        params: {
            required: ["address"],
            optional: ["tag"],
        },
        expectedOutput: "Balance in wei as a string",
        whenToUse: [
            "Need to check address native token balance",
            "Analyzing address holdings",
            "Verifying funds before transaction analysis",
        ],
    },

    GET_TRANSACTIONS: {
        name: "GET_TRANSACTIONS",
        description: "Get list of normal transactions for an address",
        category: SKILL_CATEGORIES.BASIC,
        module: "account",
        action: "txlist",
        params: {
            required: ["address"],
            optional: ["startblock", "endblock", "page", "offset", "sort"],
        },
        expectedOutput:
            "Array of transaction objects with hash, from, to, value, etc",
        whenToUse: [
            "Analyzing address transaction history",
            "Finding transaction patterns",
            "Identifying counterparties",
            "Building transaction timeline",
        ],
    },

    GET_INTERNAL_TRANSACTIONS: {
        name: "GET_INTERNAL_TRANSACTIONS",
        description:
            "Get internal transactions (contract calls) for an address",
        category: SKILL_CATEGORIES.TRANSACTION,
        module: "account",
        action: "txlistinternal",
        params: {
            required: ["address"],
            optional: ["startblock", "endblock", "page", "offset", "sort"],
        },
        expectedOutput: "Array of internal transaction objects",
        whenToUse: [
            "Analyzing contract interactions",
            "Tracing internal value transfers",
            "Understanding DeFi operations",
        ],
    },

    GET_INTERNAL_TX_BY_HASH: {
        name: "GET_INTERNAL_TX_BY_HASH",
        description: "Get internal transactions by transaction hash",
        category: SKILL_CATEGORIES.TRANSACTION,
        module: "account",
        action: "txlistinternal",
        params: {
            required: ["txhash"],
            optional: [],
        },
        expectedOutput: "Array of internal transactions within a specific tx",
        whenToUse: [
            "Deep diving into a specific transaction",
            "Understanding contract execution flow",
            "Tracing value flow within a transaction",
        ],
    },

    GET_ERC20_TRANSFERS: {
        name: "GET_ERC20_TRANSFERS",
        description: "Get ERC20 token transfer events for an address",
        category: SKILL_CATEGORIES.TOKEN,
        module: "account",
        action: "tokentx",
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
        expectedOutput: "Array of ERC20 transfer events with token details",
        whenToUse: [
            "Analyzing token holdings and transfers",
            "Identifying DeFi activity",
            "Tracking specific token movements",
        ],
    },

    GET_ERC721_TRANSFERS: {
        name: "GET_ERC721_TRANSFERS",
        description: "Get ERC721 (NFT) token transfers for an address",
        category: SKILL_CATEGORIES.TOKEN,
        module: "account",
        action: "tokennfttx",
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
        expectedOutput: "Array of ERC721 transfer events with token IDs",
        whenToUse: [
            "Analyzing NFT activity",
            "Tracking NFT collections",
            "Identifying NFT trading patterns",
        ],
    },

    GET_ERC1155_TRANSFERS: {
        name: "GET_ERC1155_TRANSFERS",
        description: "Get ERC1155 token transfers for an address",
        category: SKILL_CATEGORIES.TOKEN,
        module: "account",
        action: "token1155tx",
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
        expectedOutput: "Array of ERC1155 transfer events",
        whenToUse: [
            "Analyzing multi-token transfers",
            "Tracking gaming/metaverse assets",
        ],
    },

    // ==================== CONTRACT SKILLS ====================
    GET_CONTRACT_ABI: {
        name: "GET_CONTRACT_ABI",
        description: "Get the ABI for a verified contract",
        category: SKILL_CATEGORIES.CONTRACT,
        module: "contract",
        action: "getabi",
        params: {
            required: ["address"],
            optional: [],
        },
        expectedOutput: "Contract ABI as JSON string",
        whenToUse: [
            "Need to decode contract interactions",
            "Understanding contract interface",
            "Preparing to call contract methods",
        ],
    },

    GET_SOURCE_CODE: {
        name: "GET_SOURCE_CODE",
        description: "Get source code and metadata for a verified contract",
        category: SKILL_CATEGORIES.CONTRACT,
        module: "contract",
        action: "getsourcecode",
        params: {
            required: ["address"],
            optional: [],
        },
        expectedOutput: "Contract source code, compiler version, and settings",
        whenToUse: [
            "Analyzing contract implementation",
            "Security review of contracts",
            "Understanding contract logic",
        ],
    },

    GET_CONTRACT_CREATOR: {
        name: "GET_CONTRACT_CREATOR",
        description: "Get contract creator address and creation transaction",
        category: SKILL_CATEGORIES.CONTRACT,
        module: "contract",
        action: "getcontractcreation",
        params: {
            required: ["contractaddresses"],
            optional: [],
        },
        expectedOutput: "Creator address and deployment transaction hash",
        whenToUse: [
            "Identifying who deployed a contract",
            "Tracing contract ownership",
            "Investigating contract origins",
        ],
    },

    // ==================== BLOCK SKILLS ====================
    GET_BLOCK_REWARD: {
        name: "GET_BLOCK_REWARD",
        description: "Get block and uncle rewards by block number",
        category: SKILL_CATEGORIES.STATS,
        module: "block",
        action: "getblockreward",
        params: {
            required: ["blockno"],
            optional: [],
        },
        expectedOutput: "Block reward details",
        whenToUse: ["Analyzing miner rewards", "Block-specific analysis"],
    },

    // ==================== LOGS SKILLS ====================
    GET_LOGS: {
        name: "GET_LOGS",
        description: "Get event logs by address and/or topics",
        category: SKILL_CATEGORIES.LOGS,
        module: "logs",
        action: "getLogs",
        params: {
            required: ["address"],
            optional: [
                "fromBlock",
                "toBlock",
                "topic0",
                "topic1",
                "topic2",
                "topic3",
                "page",
                "offset",
            ],
        },
        expectedOutput: "Array of event log objects",
        whenToUse: [
            "Analyzing contract events",
            "Tracking specific event emissions",
            "Monitoring DeFi protocol activity",
            "Investigating specific contract interactions",
        ],
    },

    // ==================== STATS SKILLS ====================
    GET_ETH_PRICE: {
        name: "GET_ETH_PRICE",
        description: "Get current ETH price in BTC and USD",
        category: SKILL_CATEGORIES.STATS,
        module: "stats",
        action: "ethprice",
        params: {
            required: [],
            optional: [],
        },
        expectedOutput: "ETH price in BTC and USD",
        whenToUse: ["Converting values to USD", "Price analysis"],
    },

    GET_ETH_SUPPLY: {
        name: "GET_ETH_SUPPLY",
        description: "Get total supply of Ether",
        category: SKILL_CATEGORIES.STATS,
        module: "stats",
        action: "ethsupply",
        params: {
            required: [],
            optional: [],
        },
        expectedOutput: "Total ETH supply in wei",
        whenToUse: ["Network statistics analysis"],
    },

    // ==================== TOKEN INFO SKILLS ====================
    GET_TOKEN_SUPPLY: {
        name: "GET_TOKEN_SUPPLY",
        description: "Get total supply of an ERC20 token",
        category: SKILL_CATEGORIES.TOKEN,
        module: "stats",
        action: "tokensupply",
        params: {
            required: ["contractaddress"],
            optional: [],
        },
        expectedOutput: "Total token supply",
        whenToUse: [
            "Analyzing token economics",
            "Calculating percentage holdings",
        ],
    },

    GET_TOKEN_BALANCE: {
        name: "GET_TOKEN_BALANCE",
        description: "Get ERC20 token balance for an address",
        category: SKILL_CATEGORIES.TOKEN,
        module: "account",
        action: "tokenbalance",
        params: {
            required: ["contractaddress", "address"],
            optional: ["tag"],
        },
        expectedOutput: "Token balance in smallest unit",
        whenToUse: [
            "Checking specific token holdings",
            "Analyzing token distribution",
        ],
    },

    // ==================== PROXY/RPC SKILLS ====================
    ETH_BLOCK_NUMBER: {
        name: "ETH_BLOCK_NUMBER",
        description: "Get the current block number",
        category: SKILL_CATEGORIES.PROXY,
        module: "proxy",
        action: "eth_blockNumber",
        params: {
            required: [],
            optional: [],
        },
        expectedOutput: "Current block number in hex",
        whenToUse: ["Getting current blockchain height"],
    },

    ETH_GET_BLOCK_BY_NUMBER: {
        name: "ETH_GET_BLOCK_BY_NUMBER",
        description: "Get block information by block number",
        category: SKILL_CATEGORIES.PROXY,
        module: "proxy",
        action: "eth_getBlockByNumber",
        params: {
            required: ["tag"],
            optional: ["boolean"],
        },
        expectedOutput: "Block object with transactions",
        whenToUse: [
            "Getting detailed block information",
            "Analyzing block contents",
        ],
    },

    ETH_GET_TRANSACTION_BY_HASH: {
        name: "ETH_GET_TRANSACTION_BY_HASH",
        description: "Get transaction details by hash",
        category: SKILL_CATEGORIES.PROXY,
        module: "proxy",
        action: "eth_getTransactionByHash",
        params: {
            required: ["txhash"],
            optional: [],
        },
        expectedOutput: "Transaction object with all details",
        whenToUse: [
            "Getting full transaction details",
            "Analyzing specific transaction",
        ],
    },

    ETH_GET_TRANSACTION_RECEIPT: {
        name: "ETH_GET_TRANSACTION_RECEIPT",
        description: "Get transaction receipt by hash",
        category: SKILL_CATEGORIES.PROXY,
        module: "proxy",
        action: "eth_getTransactionReceipt",
        params: {
            required: ["txhash"],
            optional: [],
        },
        expectedOutput: "Transaction receipt with logs and status",
        whenToUse: [
            "Checking transaction status",
            "Analyzing transaction logs",
            "Verifying transaction success/failure",
        ],
    },

    ETH_GET_CODE: {
        name: "ETH_GET_CODE",
        description: "Get bytecode at an address",
        category: SKILL_CATEGORIES.PROXY,
        module: "proxy",
        action: "eth_getCode",
        params: {
            required: ["address"],
            optional: ["tag"],
        },
        expectedOutput: "Contract bytecode",
        whenToUse: [
            "Checking if address is a contract",
            "Analyzing contract bytecode",
        ],
    },

    // ==================== TRANSACTION STATUS ====================
    GET_TX_RECEIPT_STATUS: {
        name: "GET_TX_RECEIPT_STATUS",
        description: "Check execution status of a transaction",
        category: SKILL_CATEGORIES.TRANSACTION,
        module: "transaction",
        action: "gettxreceiptstatus",
        params: {
            required: ["txhash"],
            optional: [],
        },
        expectedOutput: "Status: 1 for success, 0 for failure",
        whenToUse: [
            "Verifying if transaction succeeded",
            "Checking transaction outcome",
        ],
    },
};

/**
 * Helper function to build API URL for a skill
 * @param {string} skillName - 技能名称
 * @param {Object} params - 参数对象
 * @param {string} chainId - 链 ID
 * @param {string} apiKey - Etherscan API Key
 */
export function buildSkillUrl(skillName, params, chainId = "1", apiKey) {
    const skill = SKILLS[skillName];
    if (!skill) {
        throw new Error(`Unknown skill: ${skillName}`);
    }

    const url = new URL(BASE_URL);
    url.searchParams.set("chainid", chainId);
    url.searchParams.set("module", skill.module);
    url.searchParams.set("action", skill.action);
    url.searchParams.set("apikey", apiKey);

    // Add provided parameters
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    }

    return url.toString();
}

/**
 * Get skill documentation for LLM
 */
export function getSkillsDocumentation() {
    let doc = "## Available Blockchain Analysis Skills\n\n";

    for (const [name, skill] of Object.entries(SKILLS)) {
        doc += `### ${name}\n`;
        doc += `- **Description**: ${skill.description}\n`;
        doc += `- **Category**: ${skill.category}\n`;
        doc += `- **Required params**: ${
            skill.params.required.join(", ") || "none"
        }\n`;
        doc += `- **Optional params**: ${
            skill.params.optional.join(", ") || "none"
        }\n`;
        doc += `- **When to use**: ${skill.whenToUse.join("; ")}\n\n`;
    }

    return doc;
}
