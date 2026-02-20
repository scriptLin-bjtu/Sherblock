/**
 * Shared Etherscan API client for blockchain skills
 */

import { fetch } from "undici";
import { BASE_URL, DEFAULT_TIMEOUT, RATE_LIMIT_DELAY } from "./config.js";
import { getProxyAgent } from "./proxy-agent.js";

let lastCallTime = 0;

export function buildEtherscanUrl({ module, action, chainId = "1", apiKey, options = {} }) {
    const url = new URL(BASE_URL);
    url.searchParams.set("chainid", chainId);
    url.searchParams.set("module", module);
    url.searchParams.set("action", action);
    url.searchParams.set("apikey", apiKey);

    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    }

    return url.toString();
}

async function applyRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall < RATE_LIMIT_DELAY) {
        const delay = RATE_LIMIT_DELAY - timeSinceLastCall;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    lastCallTime = Date.now();
}

export async function callEtherscanApi(url) {
    await applyRateLimit();

    const proxyAgent = getProxyAgent();

    try {
        const response = await fetch(url, {
            dispatcher: proxyAgent,
            signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "0" && data.message === "NOTOK") {
            throw new Error(`Etherscan API error: ${data.result}`);
        }

        return data;
    } catch (error) {
        if (error.name === "TimeoutError") {
            throw new Error(`Etherscan API timeout after ${DEFAULT_TIMEOUT}ms`);
        }
        throw error;
    }
}

export function formatResult(result, skillName) {
    return {
        type: "OBSERVATION",
        content: {
            skill: skillName,
            success: true,
            data: result.result || result,
        },
    };
}

export function formatError(error, skillName) {
    return {
        type: "OBSERVATION",
        content: {
            skill: skillName,
            success: false,
            error: error.message,
        },
    };
}

/**
 * Common parameter name mappings from LLM mistakes to correct API names
 */
export const COMMON_PARAM_MAPPINGS = {
    // Block range parameters
    start_block: "startblock",
    startBlock: "startblock",
    start: "startblock",
    end_block: "endblock",
    endBlock: "endblock",
    end: "endblock",
    // Pagination parameters
    limit: "offset",
    per_page: "offset",
    perPage: "offset",
    // Contract parameters
    contract_address: "contractaddress",
    contractAddress: "contractaddress",
    contract: "contractaddress",
};

/**
 * Normalize parameter names to handle common LLM mistakes
 * @param {Object} params - Original parameters
 * @param {Object} customMappings - Additional parameter mappings
 * @returns {Object} - Normalized parameters
 */
export function normalizeParams(params, customMappings = {}) {
    const normalized = { ...params };
    const mappings = { ...COMMON_PARAM_MAPPINGS, ...customMappings };

    for (const [wrong, correct] of Object.entries(mappings)) {
        if (wrong in normalized && !(correct in normalized)) {
            normalized[correct] = normalized[wrong];
            delete normalized[wrong];
        }
    }

    return normalized;
}

/**
 * Compress API response to reduce context size for LLM
 * Removes/reduces large fields while preserving key information
 * @param {Object} result - The API result
 * @param {number} maxInputLength - Maximum length for input field (default 500)
 * @returns {Object} - Compressed result
 */
export function compressResponse(result, maxInputLength = 500) {
    if (!result) return result;

    // Handle array results
    if (Array.isArray(result)) {
        return result.map(item => compressResponse(item, maxInputLength));
    }

    // Handle non-object values
    if (typeof result !== 'object') return result;

    const compressed = {};
    for (const [key, value] of Object.entries(result)) {
        // Skip null/undefined
        if (value === null || value === undefined) {
            compressed[key] = value;
            continue;
        }

        // Truncate very long hex strings (like input data)
        if (typeof value === 'string' && value.startsWith('0x') && value.length > maxInputLength) {
            compressed[key] = value.substring(0, maxInputLength) + `...[truncated, total ${value.length} chars]`;
            continue;
        }

        // Truncate very long non-hex strings
        if (typeof value === 'string' && value.length > 2000) {
            compressed[key] = value.substring(0, 2000) + `...[truncated, total ${value.length} chars]`;
            continue;
        }

        // Recursively compress nested objects
        if (typeof value === 'object' && !Array.isArray(value)) {
            compressed[key] = compressResponse(value, maxInputLength);
            continue;
        }

        // Keep arrays as-is (already handled above if it's an array of objects)
        compressed[key] = value;
    }

    return compressed;
}

/**
 * Summarize transaction list to reduce context size
 * Only keep most relevant fields for analysis
 * @param {Array} transactions - Array of transaction objects
 * @param {number} maxCount - Maximum number of transactions to keep (default 50)
 * @returns {Object} - Summary object
 */
export function summarizeTransactions(transactions, maxCount = 50) {
    if (!Array.isArray(transactions)) {
        return { error: "Expected array of transactions" };
    }

    const total = transactions.length;
    const truncated = total > maxCount;
    const keptTransactions = truncated ? transactions.slice(0, maxCount) : transactions;

    // Key fields to keep for each transaction
    const keyFields = [
        'hash',
        'from',
        'to',
        'value',
        'gas',
        'gasPrice',
        'gasUsed',
        'timeStamp',
        'blockNumber',
        'isError',
        'txreceipt_status',
        'nonce'
    ];

    const simplified = keptTransactions.map(tx => {
        const simple = {};
        for (const field of keyFields) {
            if (field in tx) {
                simple[field] = tx[field];
            }
        }

        // Convert value from wei to ETH for readability
        if (simple.value) {
            try {
                const valueEth = BigInt(simple.value) / BigInt(1e18);
                simple.valueEth = valueEth.toString();
            } catch {
                // Ignore conversion error
            }
        }

        return simple;
    });

    return {
        total,
        showing: simplified.length,
        truncated,
        note: truncated ? `Showing first ${maxCount} transactions only` : undefined,
        transactions: simplified
    };
}
