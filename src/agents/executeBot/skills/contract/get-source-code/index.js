/**
 * Get Contract Source Code Skill
 *
 * Two-tier approach:
 * 1. First call: Returns file structure summary, caches source to workspace
 * 2. Second call with filename: Returns specific file content
 */

import { buildEtherscanUrl, callEtherscanApi, formatError } from "../../lib/etherscan-client.js";
import { workspaceManager } from "../../../../../utils/workspace-manager.js";
import fs from "fs/promises";
import path from "path";

// In-memory cache for source code (key: address-chainId, value: parsed sources)
const sourceCache = new Map();

export default {
    name: "GET_SOURCE_CODE",

    description: "Get contract source code with two-tier approach: (1) First call returns file structure summary with all source files listed; (2) Second call with 'filename' parameter returns the actual Solidity source code for that specific file. Use this to incrementally read contract source code without context overflow.",

    category: "contract",

    params: {
        required: ["address"],
        optional: ["filename"], // Optional: specify file path to get its content
    },

    whenToUse: [
        "Auditing a contract",
        "Analyzing contract logic",
        "Verifying contract functionality",
        "Reading specific source files from a multi-file contract",
    ],

    examples: [
        {
            description: "Get file structure summary (first call)",
            params: { address: "0x1234..." },
        },
        {
            description: "Get specific file content (second call)",
            params: { address: "0x1234...", filename: "contracts/MyContract.sol" },
        },
    ],

    /**
     * Get cache key for source code
     */
    getCacheKey(address, chainId) {
        return `${chainId}:${address.toLowerCase()}`;
    },

    /**
     * Parse source code from Etherscan response
     */
    parseSourceCode(sourceCode) {
        if (!sourceCode) {
            return { error: "Empty source code" };
        }

        const isDoubleBrace = sourceCode.trim().startsWith("{{");

        if (isDoubleBrace) {
            try {
                const jsonStr = sourceCode.slice(1, -1);
                const parsed = JSON.parse(jsonStr);
                const sources = parsed.sources || {};

                return this.buildSourceInfo(parsed, sources);
            } catch {
                // Fall through to plain parse
            }
        }

        try {
            const parsed = JSON.parse(sourceCode);
            if (parsed.sources) {
                return this.buildSourceInfo(parsed, parsed.sources);
            }
        } catch {
            // Not JSON
        }

        // Plain Solidity source
        const lines = sourceCode.split("\n");
        return {
            isJson: false,
            sources: { "main.sol": { content: sourceCode } },
            sourceFiles: [{ path: "main.sol", lines: lines.length }],
            mainFile: "main.sol",
            totalFiles: 1,
            totalLines: lines.length,
        };
    },

    /**
     * Build source info from parsed JSON
     */
    buildSourceInfo(parsed, sources) {
        const fileList = Object.keys(sources || {});
        const sourceFiles = fileList.map((file) => ({
            path: file,
            lines: (sources[file]?.content || "").split("\n").length,
        }));

        const totalLines = sourceFiles.reduce((sum, f) => sum + f.lines, 0);

        // Find main contract (first non-library .sol file)
        const mainFile =
            fileList.find((f) => f.endsWith(".sol") && !f.includes("@openzeppelin")) ||
            fileList[0] ||
            "";

        return {
            isJson: true,
            language: parsed.language,
            settings: parsed.settings,
            sources,
            sourceFiles,
            mainFile,
            totalFiles: fileList.length,
            totalLines,
        };
    },

    /**
     * Save source code to workspace
     */
    async saveToWorkspace(address, chainId, parsed) {
        try {
            const cacheKey = this.getCacheKey(address, chainId);
            const sourcesDir = path.join(workspaceManager.getChartsPath(), "..", "contracts", cacheKey);

            await fs.mkdir(sourcesDir, { recursive: true });

            // Save each source file
            for (const [filePath, fileData] of Object.entries(parsed.sources || {})) {
                const fullPath = path.join(sourcesDir, filePath);
                const dir = path.dirname(fullPath);
                await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(fullPath, fileData.content || "", "utf-8");
            }

            // Save metadata
            await fs.writeFile(
                path.join(sourcesDir, "_metadata.json"),
                JSON.stringify(
                    {
                        address,
                        chainId,
                        totalFiles: parsed.totalFiles,
                        totalLines: parsed.totalLines,
                        mainFile: parsed.mainFile,
                    },
                    null,
                    2
                ),
                "utf-8"
            );

            return sourcesDir;
        } catch (error) {
            console.error("[get-source-code] Failed to save to workspace:", error.message);
            return null;
        }
    },

    /**
     * Build file structure summary result
     */
    buildSummaryResult(contract, parsed, cacheKey) {
        const fileList = parsed.sourceFiles || [];

        const result = {
            contractName: contract.ContractName,
            compilerVersion: contract.CompilerVersion,
            optimization:
                contract.OptimizationUsed === "1"
                    ? `Enabled (${contract.Runs} runs)`
                    : "Disabled",
            evmVersion: contract.EVMVersion,
            proxy: contract.Proxy === "1",
            implementation: contract.Implementation || null,
            // File structure summary
            sourceStructure: {
                format: parsed.isJson ? "JSON (multi-file)" : "Plain",
                totalFiles: parsed.totalFiles,
                totalLines: parsed.totalLines,
                mainFile: parsed.mainFile,
                files: fileList,
            },
            // Instructions for next step
            usage: `To read a specific file, call GET_SOURCE_CODE again with the same address and specify the filename parameter`,
            cacheKey,
        };

        if (contract.Proxy === "1") {
            result.proxyNote =
                "This is a proxy contract. Use GET_CONTRACT_ABI with the Implementation address.";
        }

        return result;
    },

    /**
     * Build file content result
     */
    buildFileResult(parsed, filename, cacheKey) {
        const content = parsed.sources?.[filename]?.content;

        if (!content) {
            return {
                error: `File not found: ${filename}`,
                availableFiles: Object.keys(parsed.sources || {}),
            };
        }

        // Count lines for the file
        const lines = content.split("\n").length;

        return {
            filename,
            lines,
            content,
            cacheKey,
            usage: `Call with different filename to read more files. Available: ${Object.keys(parsed.sources || {}).join(", ")}`,
        };
    },

    async execute(params, context) {
        const { address, filename } = params;
        const { apiKey, chainId = "1", workspaceId } = context;

        const cacheKey = this.getCacheKey(address, chainId);

        try {
            // Check if we have cached source
            let parsed = sourceCache.get(cacheKey);

            if (!parsed) {
                // First call: fetch from Etherscan
                const url = buildEtherscanUrl({
                    module: "contract",
                    action: "getsourcecode",
                    chainId,
                    apiKey,
                    options: { address },
                });

                const data = await callEtherscanApi(url);

                if (!data.result || !data.result[0]) {
                    return formatError(new Error("No source code found"), this.name);
                }

                const contract = data.result[0];
                if (contract.SourceCode === "") {
                    return formatError(new Error("Contract source code not verified"), this.name);
                }

                // Parse and cache
                parsed = this.parseSourceCode(contract.SourceCode);
                sourceCache.set(cacheKey, { parsed, contract });

                // Save to workspace if available
                if (workspaceManager.isInitialized()) {
                    await this.saveToWorkspace(address, chainId, parsed);
                }
            }

            const { parsed: cachedParsed, contract } = sourceCache.get(cacheKey);

            // If filename provided, return specific file content
            if (filename) {
                const fileResult = this.buildFileResult(cachedParsed, filename, cacheKey);
                return {
                    type: "OBSERVATION",
                    content: {
                        skill: this.name,
                        success: true,
                        data: fileResult,
                    },
                };
            }

            // Otherwise, return summary
            const summaryResult = this.buildSummaryResult(contract, cachedParsed, cacheKey);

            return {
                type: "OBSERVATION",
                content: {
                    skill: this.name,
                    success: true,
                    data: summaryResult,
                },
            };
        } catch (error) {
            return formatError(error, this.name);
        }
    },
};