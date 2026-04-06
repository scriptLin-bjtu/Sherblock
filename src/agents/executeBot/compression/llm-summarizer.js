/**
 * LLM Smart Summarizer for ExecuteAgent
 *
 * Replaces simple truncation with intelligent LLM-based summarization.
 * Generates structured summaries that preserve critical information.
 */

import { compressionConfig, debugLog, estimateTokens } from "./config.js";

/**
 * Smart Summary Data Structure
 */
export class SmartSummary {
    constructor(data = {}) {
        this.executiveSummary = data.executiveSummary || "";
        this.keyFindings = data.keyFindings || [];
        this.validatedHypotheses = data.validatedHypotheses || [];
        this.abandonedPaths = data.abandonedPaths || [];
        this.openQuestions = data.openQuestions || [];
        this.statistics = data.statistics || {
            totalSkillCalls: 0,
            uniqueSkillsUsed: [],
            dataPointsCollected: 0,
        };
        this.metadata = data.metadata || {
            generatedAt: new Date().toISOString(),
            historyEntriesSummarized: 0,
            compressionRatio: 0,
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            executiveSummary: this.executiveSummary,
            keyFindings: this.keyFindings,
            validatedHypotheses: this.validatedHypotheses,
            abandonedPaths: this.abandonedPaths,
            openQuestions: this.openQuestions,
            statistics: this.statistics,
            metadata: this.metadata,
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new SmartSummary(typeof json === "string" ? JSON.parse(json) : json);
    }

    /**
     * Format as readable text for prompts
     */
    toPromptText() {
        const parts = [];

        // Executive summary
        if (this.executiveSummary) {
            parts.push(`## Executive Summary`);
            parts.push(this.executiveSummary);
            parts.push("");
        }

        // Key findings
        if (this.keyFindings.length > 0) {
            parts.push(`## Key Findings (${this.keyFindings.length})`);
            this.keyFindings.forEach((finding, i) => {
                parts.push(`${i + 1}. [${finding.type}] ${finding.description}`);
                if (finding.dataReference) {
                    parts.push(`   Data: ${finding.dataReference}`);
                }
            });
            parts.push("");
        }

        // Validated hypotheses
        if (this.validatedHypotheses.length > 0) {
            parts.push(`## Validated Hypotheses (${this.validatedHypotheses.length})`);
            this.validatedHypotheses.forEach((h, i) => {
                const status = h.result === "confirmed" ? "✓" : h.result === "rejected" ? "✗" : "~";
                parts.push(`${i + 1}. ${status} ${h.hypothesis}`);
                parts.push(`   Evidence: ${h.evidence}`);
            });
            parts.push("");
        }

        // Open questions
        if (this.openQuestions.length > 0) {
            const blocking = this.openQuestions.filter((q) => q.blocking);
            const nonBlocking = this.openQuestions.filter((q) => !q.blocking);

            if (blocking.length > 0) {
                parts.push(`## ⚠️ Blocking Questions (${blocking.length})`);
                blocking.forEach((q, i) => {
                    parts.push(`${i + 1}. [${q.priority}] ${q.question}`);
                });
                parts.push("");
            }

            if (nonBlocking.length > 0) {
                parts.push(`## Open Questions (${nonBlocking.length})`);
                nonBlocking.slice(0, 3).forEach((q, i) => {
                    parts.push(`${i + 1}. [${q.priority}] ${q.question}`);
                });
                if (nonBlocking.length > 3) {
                    parts.push(`... and ${nonBlocking.length - 3} more`);
                }
                parts.push("");
            }
        }

        // Statistics
        if (this.statistics.totalSkillCalls > 0) {
            parts.push(`## Execution Statistics`);
            parts.push(`- Skill calls: ${this.statistics.totalSkillCalls}`);
            parts.push(`- Unique skills: ${this.statistics.uniqueSkillsUsed.join(", ") || "none"}`);
            parts.push(`- Data points: ${this.statistics.dataPointsCollected}`);
            parts.push("");
        }

        // Abandoned paths (if any)
        if (this.abandonedPaths.length > 0) {
            parts.push(`## Abandoned Paths (${this.abandonedPaths.length})`);
            this.abandonedPaths.slice(0, 3).forEach((p, i) => {
                parts.push(`${i + 1}. ${p.path} (${p.reason})`);
            });
            parts.push("");
        }

        return parts.join("\n");
    }
}

/**
 * LLM Smart Summarizer Class
 */
export class LLMSmartSummarizer {
    constructor(callLLM, config = {}) {
        this.callLLM = callLLM;
        this.config = {
            ...compressionConfig,
            ...config,
        };

        // Summarization triggers - token-based only
        this.triggerConfig = {
            // Trigger when estimated tokens exceed this (default: 64k)
            tokenThreshold: config.tokenThreshold || 64000,
            // Always keep this many recent entries unsummarized
            preserveRecentEntries: config.preserveRecentEntries || 3,
            // Maximum summaries to keep (oldest get merged)
            maxSummaries: config.maxSummaries || 3,
        };

        // State
        this.summaries = []; // Array of SmartSummary objects
        this.workingHistory = []; // Recent unsummarized entries
        this.stats = {
            totalSummarizations: 0,
            totalEntriesSummarized: 0,
            totalTokensSaved: 0,
            averageCompressionRatio: 0,
        };
    }

    /**
     * Process new history entry
     * Returns potentially compressed history for prompt
     */
    async addHistory(entry) {
        this.workingHistory.push(entry);

        // Check if we need to trigger summarization
        const shouldSummarize = this.shouldTriggerSummarization();

        if (shouldSummarize) {
            await this.performSummarization();
        }

        // Return current view for prompt construction
        return this.getCurrentContextView();
    }

    /**
     * Check if we should trigger summarization
     * Only triggers based on token count, not entry count
     */
    shouldTriggerSummarization() {
        // Check token threshold only
        const estimatedTokens = this.estimateHistoryTokens();
        return estimatedTokens >= this.triggerConfig.tokenThreshold;
    }

    /**
     * Estimate tokens in working history
     */
    estimateHistoryTokens() {
        const historyStr = JSON.stringify(this.workingHistory);
        return estimateTokens(historyStr);
    }

    /**
     * Perform LLM-based summarization
     */
    async performSummarization() {
        console.log(`[LLMSmartSummarizer] Triggering summarization for ${this.workingHistory.length} entries`);

        // Determine what to summarize vs preserve
        const preserveCount = this.triggerConfig.preserveRecentEntries;
        const entriesToSummarize = this.workingHistory.slice(0, -preserveCount);
        const entriesToPreserve = this.workingHistory.slice(-preserveCount);

        // Build summarization prompt
        const prompt = this.buildSummarizationPrompt(entriesToSummarize);

        // Call LLM for summarization
        try {
            const summary = await this.callSummarizationLLM(prompt);

            // Store summary
            this.summaries.push(summary);

            // Merge old summaries if exceeding max
            if (this.summaries.length > this.triggerConfig.maxSummaries) {
                await this.mergeOldestSummaries();
            }

            // Update working history
            this.workingHistory = entriesToPreserve;

            // Update stats
            this.updateStats(entriesToSummarize.length, summary);

            console.log(`[LLMSmartSummarizer] Summarization complete. Saved ${entriesToSummarize.length} entries as summary.`);

        } catch (error) {
            console.error(`[LLMSmartSummarizer] Summarization failed:`, error);
            // Fallback: just truncate (old behavior)
            this.workingHistory = entriesToPreserve;
        }
    }

    /**
     * Build prompt for LLM summarization
     */
    buildSummarizationPrompt(entries) {
        const currentStep = this.currentStep || {};

        return `You are an expert execution summarizer for a blockchain analysis agent.
Your task is to analyze the execution history and generate a structured summary that preserves critical information for continuing the task.

## Current Step Goal
${currentStep.goal || "Execute analysis step"}

## Success Criteria
${JSON.stringify(currentStep.success_criteria || {}, null, 2)}

## Execution History to Summarize
${entries.map((e, i) => `${i + 1}. [${e.type}] ${JSON.stringify(e.content, null, 2).substring(0, 500)}`).join("\n\n")}

## Output Instructions
Generate a structured summary in JSON format with the following fields:

1. **executiveSummary**: One concise sentence summarizing what has been accomplished in these ${entries.length} iterations.

2. **keyFindings**: Array of important data discoveries. Each finding should include:
   - type: "data" | "pattern" | "anomaly" | "correlation"
   - description: Clear description of the finding
   - dataReference: Path in scope data where this finding is stored

3. **validatedHypotheses**: Array of hypotheses tested and their results:
   - hypothesis: The hypothesis being tested
   - result: "confirmed" | "rejected" | "partially_confirmed"
   - evidence: Key evidence supporting the result

4. **abandonedPaths**: Array of exploration paths that were abandoned:
   - path: Description of what was attempted
   - reason: "no_data" | "irrelevant" | "time_constraint" | "error"
   - lastAttempt: What was last tried before abandoning

5. **openQuestions**: Array of unanswered questions that may need follow-up:
   - question: The question
   - priority: "high" | "medium" | "low"
   - blocking: Whether this blocks further progress

6. **statistics**: Execution statistics:
   - totalSkillCalls: Total number of skills called
   - uniqueSkillsUsed: Array of unique skill names used
   - dataPointsCollected: Approximate number of data points gathered

Output ONLY the JSON object, no other text.`;
    }

    /**
     * Call LLM for summarization
     */
    async callSummarizationLLM(prompt) {
        if (!this.callLLM) {
            throw new Error("callLLM function not provided to LLMSmartSummarizer");
        }

        const response = await this.callLLM({
            systemPrompt: "You are a specialized summarization agent. Output only valid JSON.",
            user_messages: [{ type: "text", text: prompt }],
            modelProvider: "deepseek",
            temperature: 0.3, // Lower temperature for consistent output
        });

        // Parse the JSON response
        const content = response.data || response;
        let parsed;

        if (typeof content === "string") {
            // Try to extract JSON if wrapped in markdown
            const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                               content.match(/```\s*([\s\S]*?)```/) ||
                               content.match(/(\{[\s\S]*\})/);

            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                parsed = JSON.parse(content);
            }
        } else {
            parsed = content;
        }

        return SmartSummary.fromJSON(parsed);
    }

    /**
     * Merge oldest summaries when exceeding max
     */
    async mergeOldestSummaries() {
        if (this.summaries.length < 2) return;

        // Take the two oldest summaries and merge them
        const oldest = this.summaries[0];
        const secondOldest = this.summaries[1];

        const mergePrompt = `Merge these two execution summaries into a single coherent summary:

## Summary 1 (Older)
${oldest.toPromptText()}

## Summary 2 (Newer)
${secondOldest.toPromptText()}

Create a merged summary that preserves all critical information. Output in the same JSON format.`;

        try {
            const merged = await this.callSummarizationLLM(mergePrompt);
            // Replace the two oldest with the merged summary
            this.summaries = [merged, ...this.summaries.slice(2)];
        } catch (error) {
            console.error("[LLMSmartSummarizer] Failed to merge summaries:", error);
            // Keep the newer one as fallback
            this.summaries = [secondOldest, ...this.summaries.slice(2)];
        }
    }

    /**
     * Get current context view for prompt construction
     */
    getCurrentContextView() {
        return {
            // Structured summaries
            summaries: this.summaries.map((s) => s.toJSON()),

            // Working history (recent unsummarized entries)
            workingHistory: this.workingHistory,

            // Formatted text for prompts
            formattedText: this.formatContextForPrompt(),
        };
    }

    /**
     * Format context for inclusion in prompt
     */
    formatContextForPrompt() {
        const parts = [];

        // Add summaries
        if (this.summaries.length > 0) {
            parts.push("## Previous Execution Summary");
            parts.push("The following summarizes earlier execution history:");
            parts.push("");

            this.summaries.forEach((summary, i) => {
                if (this.summaries.length > 1) {
                    parts.push(`### Summary Part ${i + 1}`);
                }
                parts.push(summary.toPromptText());
                parts.push("");
            });
        }

        // Add working history
        if (this.workingHistory.length > 0) {
            parts.push("## Recent Actions");
            parts.push("The following are the most recent actions (not yet summarized):");
            parts.push("");

            this.workingHistory.forEach((entry, i) => {
                const type = entry.type || "UNKNOWN";
                let content = "";
                try {
                    content = typeof entry.content === "string" ? entry.content : JSON.stringify(entry.content).substring(0, 300);
                } catch {
                    content = "[Error formatting content]";
                }
                parts.push(`${i + 1}. [${type}] ${content}`);
            });
            parts.push("");
        }

        return parts.join("\n");
    }

    /**
     * Update statistics
     */
    updateStats(entriesSummarized, summary) {
        this.stats.totalSummarizations++;
        this.stats.totalEntriesSummarized += entriesSummarized;

        // Calculate tokens saved (rough estimate)
        const originalTokens = entriesSummarized * 500; // Assume ~500 tokens per entry
        const summaryTokens = estimateTokens(JSON.stringify(summary.toJSON()));
        const saved = originalTokens - summaryTokens;

        this.stats.totalTokensSaved += Math.max(0, saved);

        // Update average compression ratio
        const totalEntries = this.stats.totalEntriesSummarized;
        const currentAvg = this.stats.averageCompressionRatio;
        const newRatio = saved / Math.max(1, originalTokens);
        this.stats.averageCompressionRatio = (currentAvg * (totalEntries - entriesSummarized) + newRatio * entriesSummarized) / Math.max(1, totalEntries);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            summaryCount: this.summaries.length,
            workingHistorySize: this.workingHistory.length,
            // Only return token-based threshold (no entry threshold)
            tokenThreshold: this.triggerConfig.tokenThreshold,
            preserveRecentEntries: this.triggerConfig.preserveRecentEntries,
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.summaries = [];
        this.workingHistory = [];
        this.stats = {
            totalSummarizations: 0,
            totalEntriesSummarized: 0,
            totalTokensSaved: 0,
            averageCompressionRatio: 0,
        };
    }

    /**
     * Set current step context for better summarization
     */
    setCurrentStep(step) {
        this.currentStep = step;
    }
}

export default LLMSmartSummarizer;
