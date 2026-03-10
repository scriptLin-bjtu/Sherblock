/**
 * User Prompt Generator for ExecuteAgent
 *
 * Generates the dynamic content for each LLM call:
 * - Current Analysis Scope
 * - Current Step to Execute
 * - Execution History
 *
 * This content changes on each ReAct iteration, so it cannot be cached.
 */

/**
 * Generate the user prompt for ExecuteAgent
 * @param {Object} scope - The analysis scope object (possibly compressed)
 * @param {Object} currentStep - The current step to execute
 * @param {Array} executionHistory - History of actions and observations (possibly compressed)
 * @returns {string} - The user prompt
 */
export function generateUserPrompt(scope, currentStep, executionHistory = []) {
    // Defensive check: ensure executionHistory is an array
    const safeHistory = Array.isArray(executionHistory) ? executionHistory : [];
    const safeScope = scope || {};
    const safeStep = currentStep || {};

    const parts = [];

    // Add scope section
    parts.push("# Current Analysis Scope");
    parts.push(JSON.stringify(safeScope, null, 2));
    parts.push("");

    // Add current step section
    parts.push("# Current Step to Execute");
    parts.push(JSON.stringify(safeStep, null, 2));
    parts.push("");

    // Add execution history section
    parts.push("# Execution History");
    if (safeHistory.length > 0) {
        parts.push(formatExecutionHistory(safeHistory));

        // Add note if history was summarized
        const hasSummary = safeHistory.some(h => h && h.isMeta);
        if (hasSummary) {
            parts.push("");
            parts.push("[Note: Earlier entries have been summarized to save context]");
        }
    } else {
        parts.push("(no previous actions)");
    }
    parts.push("");

    parts.push("Now, based on the current scope and step, think carefully and output your next action.");

    return parts.join("\n");
}

/**
 * Format execution history for display
 * @param {Array} history - Execution history array
 * @returns {string} - Formatted history string
 */
function formatExecutionHistory(history) {
    if (!history || history.length === 0) {
        return "(no previous actions)";
    }

    return history
        .map((h, i) => {
            // Skip numbering for meta entries (summaries)
            if (h.isMeta) {
                return h.content || "";
            }

            // Defensive check: ensure h has required properties
            if (!h) {
                return `${i + 1}. [UNKNOWN] Invalid history entry`;
            }

            const type = h.type || "UNKNOWN";
            let contentStr = "";

            try {
                if (typeof h.content === "string") {
                    contentStr = h.content;
                } else if (h.content !== null && h.content !== undefined) {
                    contentStr = JSON.stringify(h.content, null, 2);
                } else {
                    contentStr = "No content";
                }
            } catch (error) {
                // 详细错误定位信息
                console.error("[ERROR] formatExecutionHistory failed at entry", i, {
                    entryType: type,
                    contentType: typeof h.content,
                    error: error.message,
                    stack: error.stack,
                });
                contentStr = `[Error formatting content: ${error.message}]`;
            }

            return `${i + 1}. [${type}] ${contentStr}`;
        })
        .join("\n\n");
}

/**
 * Generate initial observation message
 * @param {Object} currentStep - Current step object
 * @returns {string} - Initial observation
 */
export function generateInitialObservation(currentStep) {
    if (!currentStep) {
        return "Starting execution of step: (no step information available)";
    }

    const goal = currentStep.goal || "(no goal specified)";
    const successCriteria = currentStep.success_criteria || "(no criteria specified)";
    const constraints = currentStep.constraints || "none";

    let successCriteriaStr, constraintsStr;

    try {
        successCriteriaStr = JSON.stringify(successCriteria);
    } catch (error) {
        console.error("[ERROR] JSON.stringify(success_criteria) failed:", {
            value: successCriteria,
            error: error.message,
            stack: error.stack,
        });
        successCriteriaStr = String(successCriteria);
    }

    try {
        constraintsStr = JSON.stringify(constraints);
    } catch (error) {
        console.error("[ERROR] JSON.stringify(constraints) failed:", {
            value: constraints,
            error: error.message,
            stack: error.stack,
        });
        constraintsStr = String(constraints);
    }

    return `Starting execution of step: "${goal}".
Success criteria: ${successCriteriaStr}
Constraints: ${constraintsStr}`;
}

export default {
    generate: generateUserPrompt,
    generateInitialObservation,
};
