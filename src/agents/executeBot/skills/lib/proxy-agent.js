/**
 * Shared proxy configuration for blockchain API calls
 */

import { ProxyAgent } from "undici";

const DEFAULT_PROXY = "http://127.0.0.1:7890";

export function getProxyAgent() {
    const proxyUrl = process.env.HTTP_PROXY || DEFAULT_PROXY;
    return new ProxyAgent(proxyUrl);
}

export function getProxyUrl() {
    return process.env.HTTP_PROXY || DEFAULT_PROXY;
}
