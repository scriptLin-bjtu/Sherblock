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
    const parts = [];

    // Add scope section
    parts.push("# Current Analysis Scope");
    parts.push(JSON.stringify(scope, null, 2));
    parts.push("");

    // Add current step section
    parts.push("# Current Step to Execute");
    parts.push(JSON.stringify(currentStep, null, 2));
    parts.push("");

    // Add execution history section
    parts.push("# Execution History");
    if (executionHistory.length > 0) {
        parts.push(formatExecutionHistory(executionHistory));

        // Add note if history was summarized
        const hasSummary = executionHistory.some(h => h.isMeta);
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
                return h.content;
            }

            let contentStr =
                typeof h.content === "string"
                    ? h.content
                    : JSON.stringify(h.content, null, 2);

            return `${i + 1}. [${h.type}] ${contentStr}`;
        })
        .join("\n\n");
}

/**
 * Generate initial observation message
 * @param {Object} currentStep - Current step object
 * @returns {string} - Initial observation
 */
export function generateInitialObservation(currentStep) {
    return `Starting execution of step: "${currentStep.goal}".
Success criteria: ${JSON.stringify(currentStep.success_criteria)}
Constraints: ${JSON.stringify(currentStep.constraints || "none")}`;
}

export default {
    generate: generateUserPrompt,
    generateInitialObservation,
};
