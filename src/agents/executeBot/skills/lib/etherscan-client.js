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
