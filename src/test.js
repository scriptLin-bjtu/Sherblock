/**
 * Etherscan API 直接测试
 * 通过本地 VPN 代理访问
 */

import "dotenv/config";
import { ProxyAgent } from "undici";

const API_KEY = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
const TEST_ADDRESS = "0xB23d9Af50ff1a269Ec0a3De6FefdE0B4627a8338";

// Etherscan V2 API URL
const BASE_URL = "https://api.etherscan.io/v2/api";

// 本地 VPN 代理地址
const PROXY_HOST = "http://127.0.0.1:7890";
const proxyAgent = new ProxyAgent(PROXY_HOST);

// 测试用例
const testCases = [
    {
        name: "获取 Polygon 地址余额",
        url: `${BASE_URL}?chainid=137&module=account&action=balance&address=${TEST_ADDRESS}&apikey=${API_KEY}`,
    },
    {
        name: "获取 Polygon 交易列表",
        url: `${BASE_URL}?chainid=137&module=account&action=txlist&address=${TEST_ADDRESS}&page=1&offset=5&apikey=${API_KEY}`,
    },
    {
        name: "获取 ETH 价格",
        url: `${BASE_URL}?chainid=1&module=stats&action=ethprice&apikey=${API_KEY}`,
    },
];

console.log("========== Etherscan API 测试 (本地代理) ==========\n");
console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
console.log(`测试地址: ${TEST_ADDRESS}`);
console.log(`代理地址: ${PROXY_HOST}\n`);

for (const test of testCases) {
    console.log(`📡 测试: ${test.name}`);
    console.log(
        `   URL: ${test.url.replace(API_KEY, "***").substring(0, 80)}...`
    );

    try {
        const startTime = Date.now();
        const response = await fetch(test.url, {
            dispatcher: proxyAgent, // 使用代理
            signal: AbortSignal.timeout(15000),
        });
        const elapsed = Date.now() - startTime;

        const data = await response.json();

        if (data.status === "1" || data.message === "OK") {
            console.log(`   ✅ 成功! (${elapsed}ms)`);
            console.log(
                `   📦 结果: ${JSON.stringify(data.result).substring(
                    0,
                    100
                )}...`
            );
        } else {
            console.log(`   ⚠️ API 返回错误: ${data.message || data.result}`);
        }
    } catch (error) {
        console.log(`   ❌ 请求失败: ${error.message}`);
        if (error.cause) {
            console.log(`   原因: ${error.cause.message || error.cause}`);
        }
    }
    console.log("");
}

console.log("========== 测试完成 ==========");
