/**
 * Scope Filter for ExecuteAgent
 *
 * Filters scope to only include relevant fields:
 * - Core fields (basic_infos, target_address, chain) always included
 * - Large arrays/objects summarized (count + sample)
 * - Step-specific fields extracted from currentStep description
 */

import { compressionConfig, debugLog, estimateTokens } from "./config.js";
import { HistoryCompressor } from "./history-compressor.js";

/**
 * Scope Filter class
 */
export class ScopeFilter {
    constructor(config = {}) {
        this.config = {
            ...compressionConfig.scope,
            ...config,
        };
        this.compressor = new HistoryCompressor({
            maxContentLength: this.config.maxStringLength,
            maxArrayLength: this.config.maxArrayLength,
            maxObjectKeys: this.config.maxObjectKeys,
        });
        this.stats = {
            originalSize: 0,
            compressedSize: 0,
            originalTokens: 0,
            compressedTokens: 0,
            filteredFields: 0,
            summarizedFields: 0,
        };
    }

    /**
     * Filter scope to include only relevant fields
     * @param {Object} scope - Original scope object
     * @param {Object} currentStep - Current step being executed
     * @returns {Object} - Filtered scope
     */
    filter(scope, currentStep) {
        // Calculate original size with error handling
        let originalSize = 0;
        try {
            originalSize = JSON.stringify(scope).length;
        } catch (error) {
            console.error("[ERROR] ScopeFilter: JSON.stringify(scope) failed:", {
                error: error.message,
                stack: error.stack,
            });
            originalSize = 0;
        }

        this.stats = {
            originalSize,
            compressedSize: 0,
            originalTokens: 0,
            compressedTokens: 0,
            filteredFields: 0,
            summarizedFields: 0,
        };

        if (!scope) {
            return {};
        }

        // Calculate original tokens with error handling
        let originalStr = "{}";
        try {
            originalStr = JSON.stringify(scope, null, 2);
        } catch (error) {
            console.error("[ERROR] ScopeFilter: JSON.stringify(scope, null, 2) failed:", {
                error: error.message,
                stack: error.stack,
            });
            originalStr = JSON.stringify({ _error: "Unable to serialize scope" }, null, 2);
        }
        this.stats.originalTokens = estimateTokens(originalStr);

        // Extract relevant fields from current step
        const relevantFields = this.extractRelevantFields(currentStep);

        // Build filtered scope
        const filtered = {};

        // Always include core fields
        for (const field of this.config.coreFields) {
            if (this.hasValue(scope, field)) {
                const value = this.getValue(scope, field);
                filtered[field] = this.compressValue(value, field);
                this.stats.filteredFields++;
            }
        }

        // Include relevant fields from current step
        for (const field of relevantFields) {
            if (
                !this.config.coreFields.includes(field) &&
                !this.config.excludedFields.includes(field) &&
                this.hasValue(scope, field)
            ) {
                const value = this.getValue(scope, field);
                filtered[field] = this.compressValue(value, field);
                this.stats.filteredFields++;
            }
        }

        // Include remaining fields (except excluded ones)
        for (const field of Object.keys(scope)) {
            if (
                !this.config.coreFields.includes(field) &&
                !relevantFields.includes(field) &&
                !this.config.excludedFields.includes(field) &&
                !filtered.hasOwnProperty(field)
            ) {
                const value = this.getValue(scope, field);
                filtered[field] = this.compressValue(value, field);
                this.stats.filteredFields++;
            }
        }

        // Calculate compressed tokens with error handling
        let compressedStr = "{}";
        try {
            compressedStr = JSON.stringify(filtered, null, 2);
        } catch {
            compressedStr = JSON.stringify({ _error: "Unable to serialize filtered scope" }, null, 2);
        }
        this.stats.compressedSize = compressedStr.length;
        this.stats.compressedTokens = estimateTokens(compressedStr);

        debugLog("Scope filtered", {
            originalKeys: Object.keys(scope).length,
            filteredKeys: Object.keys(filtered).length,
            originalTokens: this.stats.originalTokens,
            compressedTokens: this.stats.compressedTokens,
            savedTokens: this.stats.originalTokens - this.stats.compressedTokens,
            savedPercent: this.stats.originalTokens > 0
                ? Math.round(
                    ((this.stats.originalTokens - this.stats.compressedTokens) /
                        this.stats.originalTokens) * 100
                )
                : 0,
            summarizedFields: this.stats.summarizedFields,
        });

        return filtered;
    }

    /**
     * Extract relevant fields from current step description
     * @param {Object} step - Current step object
     * @returns {Array} - Array of relevant field names
     */
    extractRelevantFields(step) {
        if (!step) {
            return [];
        }

        const fields = new Set();
        let text = "";
        try {
            text = JSON.stringify(step).toLowerCase();
        } catch (error) {
            console.error("[ERROR] ScopeFilter: JSON.stringify(step) failed:", {
                error: error.message,
                stack: error.stack,
            });
            text = "";
        }

        // Common field patterns
        const patterns = {
            transactions: /\b(transactions?|tx|transfers?)\b/i,
            balances: /\b(balances?|balance|native|eth|token)\b/i,
            contracts: /\b(contract|abi|source|bytecode)\b/i,
            tokens: /\b(token|erc20|erc721|erc1155|nft)\b/i,
            addresses: /\b(addresses?|from|to|sender|receiver)\b/i,
            events: /\b(event|log|emitted)\b/i,
            blocks: /\b(block|timestamp|height)\b/i,
            gas: /\b(gas|fee|cost)\b/i,
            internal: /\b(internal|call)\b/i,
        };

        for (const [fieldName, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                fields.add(fieldName);
            }
        }

        return Array.from(fields);
    }

    /**
     * Compress a value based on its type and field name
     * @param {any} value - Value to compress
     * @param {string} fieldName - Name of the field
     * @returns {any} - Compressed value
     */
    compressValue(value, fieldName) {
        if (value === null || value === undefined) {
            return value;
        }

        // Check if this field should always be summarized
        if (this.config.alwaysSummarizeFields.includes(fieldName)) {
            const result = this.compressLargeData(value);
            this.stats.summarizedFields++;
            return result;
        }

        // Primitives - check string length
        if (typeof value === "string") {
            if (value.length > this.config.maxStringLength) {
                this.stats.summarizedFields++;
                return this.truncateString(value, this.config.maxStringLength);
            }
            return value;
        }

        // Arrays - check length
        if (Array.isArray(value)) {
            if (value.length > this.config.maxArrayLength) {
                const result = this.summarizeArray(value, fieldName);
                this.stats.summarizedFields++;
                return result;
            }
            return value;
        }

        // Objects - check key count and size
        if (typeof value === "object") {
            const keys = Object.keys(value);

            // Check if object is too large
            if (keys.length > this.config.maxObjectKeys) {
                const result = this.summarizeObject(value, fieldName);
                this.stats.summarizedFields++;
                return result;
            }

            // Recursively compress nested values
            const result = {};
            for (const key of keys) {
                result[key] = this.compressValue(value[key], `${fieldName}.${key}`);
            }
            return result;
        }

        return value;
    }

    /**
     * Compress large data structures
     * @param {any} data - Data to compress
     * @returns {any} - Compressed data
     */
    compressLargeData(data) {
        if (data === null || data === undefined) {
            return data;
        }

        if (typeof data === "string") {
            return this.truncateString(data, this.config.maxStringLength);
        }

        if (Array.isArray(data)) {
            return this.summarizeArray(data);
        }

        if (typeof data === "object") {
            return this.summarizeObject(data);
        }

        return data;
    }

    /**
     * Summarize an array
     * @param {Array} arr - Array to summarize
     * @param {string} fieldName - Field name (for context)
     * @returns {Object} - Summary object
     */
    summarizeArray(arr, fieldName = "") {
        if (!Array.isArray(arr) || arr.length === 0) {
            return arr;
        }

        const sampleSize = Math.min(3, arr.length);
        const summary = {
            _type: "array_summary",
            _count: arr.length,
            _sample: arr.slice(0, sampleSize).map((item, idx) =>
                this.compressor.smartTruncate(item)
            ),
        };

        // Add field name for context
        if (fieldName) {
            summary._field = fieldName;
        }

        return summary;
    }

    /**
     * Summarize an object
     * @param {Object} obj - Object to summarize
     * @param {string} fieldName - Field name (for context)
     * @returns {Object} - Summary object
     */
    summarizeObject(obj, fieldName = "") {
        if (!obj || typeof obj !== "object") {
            return obj;
        }

        const keys = Object.keys(obj);
        const sampleSize = Math.min(5, keys.length);

        const summary = {
            _type: "object_summary",
            _key_count: keys.length,
        };

        // Add sample keys
        const sampleKeys = keys.slice(0, sampleKeys);

        // Extract sample values - keep them small
        for (const key of sampleKeys) {
            summary[key] = this.compressor.smartTruncate(obj[key]);
        }

        // Add field name for context
        if (fieldName) {
            summary._field = fieldName;
        }

        return summary;
    }

    /**
     * Truncate string to max length
     */
    truncateString(str, maxLength) {
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + "...[truncated]";
    }

    /**
     * Check if scope has a nested value
     * @param {Object} scope - Scope object
     * @param {string} path - Dot-separated path
     * @returns {boolean}
     */
    hasValue(scope, path) {
        const value = this.getValue(scope, path);
        return value !== undefined && value !== null;
    }

    /**
     * Get nested value from scope
     * @param {Object} scope - Scope object
     * @param {string} path - Dot-separated path
     * @returns {any}
     */
    getValue(scope, path) {
        if (!scope) return undefined;

        const keys = path.split(".");
        let current = scope;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Get compression statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            originalSize: 0,
            compressedSize: 0,
            originalTokens: 0,
            compressedTokens: 0,
            filteredFields: 0,
            summarizedFields: 0,
        };
    }
}

export default ScopeFilter;
