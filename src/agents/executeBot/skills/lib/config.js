/**
 * Shared configuration for blockchain skills
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
    sepolia: "11155111",
    polygon_amoy: "80002",
};

export const BASE_URL = "https://api.etherscan.io/v2/api";
export const DEFAULT_TIMEOUT = 30000;
export const RATE_LIMIT_DELAY = 300;
