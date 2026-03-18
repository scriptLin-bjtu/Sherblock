import { SkillRegistry, SUPPORTED_CHAINS } from "./skills/index.js";

// Skill registry for generating documentation
const skillRegistry = new SkillRegistry();
let skillsDocCache = null;

function getSkillsDocumentation() {
    if (skillsDocCache) return skillsDocCache;
    if (!skillRegistry.initialized) {
        // Return basic docs if not initialized
        return "Skills documentation available after registry initialization.";
    }
    skillsDocCache = skillRegistry.generateDocumentation();
    return skillsDocCache;
}

/**
 * Generate the system prompt for ExecuteAgent
 * @param {Object} scope - The analysis scope object
 * @param {Object} currentStep - The current step to execute
 * @param {Array} executionHistory - History of actions and observations
 * @returns {string} - The system prompt
 */
export function prompt(scope, currentStep, executionHistory = []) {
    // Defensive check: ensure executionHistory is an array
    const safeHistory = Array.isArray(executionHistory) ? executionHistory : [];
    const safeScope = scope || {};
    const safeStep = currentStep || {};

    // Format execution history with truncation to prevent context overflow
    const MAX_CONTENT_LENGTH = 1500; // Max chars per history entry
    const MAX_HISTORY_ENTRIES = 15; // Max number of history entries to include

    const truncatedHistory = safeHistory.slice(-MAX_HISTORY_ENTRIES);

    const historyStr =
        truncatedHistory.length > 0
            ? truncatedHistory
                  .map((h, i) => {
                      // Defensive check for invalid history entries
                      if (!h) {
                          return `${i + 1}. [UNKNOWN] Invalid entry`;
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

                          // Truncate if too long
                          if (contentStr.length > MAX_CONTENT_LENGTH) {
                              contentStr =
                                  contentStr.substring(0, MAX_CONTENT_LENGTH) +
                                  `...[truncated, total ${contentStr.length} chars]`;
                          }
                      } catch (error) {
                          // 详细错误定位信息
                          console.error("[ERROR] prompt.js: format history entry failed at index", i, {
                              entryType: type,
                              contentType: typeof h.content,
                              error: error.message,
                              stack: error.stack,
                          });
                          contentStr = `[Error formatting: ${error.message}]`;
                      }

                      return `${i + 1}. [${type}] ${contentStr}`;
                  })
                  .join("\n\n")
            : "(no previous actions)";

    // Add note if history was truncated
    const historyNote =
        safeHistory.length > MAX_HISTORY_ENTRIES
            ? `\n[Note: History truncated from ${safeHistory.length} to ${MAX_HISTORY_ENTRIES} most recent entries]`
            : "";

    // Get skills documentation
    const skillsDoc = getSkillsDocumentation();

    // Format supported chains
    const chainsDoc = Object.entries(SUPPORTED_CHAINS)
        .map(([name, id]) => `  - ${name}: ${id}`)
        .join("\n");

    return `
You are the **Execution Module** in a "Blockchain Transaction Behavior Analysis Agent".
You operate using the **ReAct (Reasoning → Action → Observation)** paradigm.

# Core Responsibility
Execute ONE specific step from the analysis plan by:
1. Reasoning about what information is needed
2. Selecting and executing appropriate blockchain analysis skills
3. Observing results and reasoning about next actions
4. Continuing until the step's success criteria are met

# Current Analysis Scope
${JSON.stringify(safeScope, null, 2)}

# Current Step to Execute
${JSON.stringify(safeStep, null, 2)}

# Execution History
${historyStr}${historyNote}

# Supported Chains
${chainsDoc}

${skillsDoc}

# Available Actions

## 1. USE_SKILL — Execute a blockchain analysis skill
Use this to query blockchain data via Etherscan API.

\`\`\`json
{
  "thought": "I need to check the native balance of the target address to understand their holdings",
  "action_type": "USE_SKILL",
  "skill_name": "GET_NATIVE_BALANCE",
  "params": {
    "address": "0x..."
  },
  "chain_id": "1"
}
\`\`\`

**Required fields:**
- thought: Your reasoning for this action
- action_type: "USE_SKILL"
- skill_name: Name of the skill from the available skills
- params: Object with required parameters for the skill
- chain_id: (optional) Chain ID to query, defaults to scope's chain

**IMPORTANT - Parameter Naming:**
Use EXACT parameter names as documented for each skill:
- Block range: "startblock", "endblock" (NOT "start_block", "startBlock", etc.)
- Pagination: "offset" for number of items per page (NOT "limit")
- Always check skill documentation for correct parameter names

## 2. UPDATE_SCOPE — Update the analysis scope with findings
Use this to record important discoveries that should persist.

\`\`\`json
{
  "thought": "I discovered 5 related addresses that interact frequently with the target",
  "action_type": "UPDATE_SCOPE",
  "updates": {
    "discovered_addresses": ["0x...", "0x..."],
    "findings": {
      "total_transactions": 150,
      "first_activity": "2023-01-15"
    }
  }
}
\`\`\`

## 3. FINISH — Complete this step
Use this when you have accomplished the step's goal and met success criteria.

\`\`\`json
{
  "thought": "I have successfully traced the fund sources and identified the key patterns",
  "action_type": "FINISH",
  "result": {
    "status": "success",
    "summary": "Brief summary of what was accomplished",
    "data": {
      // Relevant data collected during this step
    },
    "next_step_inputs": {
      // Any data that should be passed to the next step
    }
  }
}
\`\`\`

For failure cases:
\`\`\`json
{
  "thought": "Unable to complete due to API rate limits after multiple retries",
  "action_type": "FINISH",
  "result": {
    "status": "failure",
    "reason": "API rate limit exceeded",
    "partial_data": {}
  }
}
\`\`\`

# Execution Guidelines

## ReAct Loop
1. **Reason**: Think about what information you need to accomplish the step goal
2. **Act**: Choose an appropriate skill to gather that information
3. **Observe**: Analyze the results returned
4. **Repeat**: Continue reasoning and acting until done

## Step Success Criteria
Always refer to the step's \`success_criteria\` field to determine when to FINISH.

## Handling Errors
- If a skill fails, reason about why and try an alternative approach
- After 3 failed attempts on the same query, consider moving on or reporting partial results
- Record error information in the result

## Data Interpretation
- Balances are typically in wei (divide by 1e18 for ETH)
- Timestamps are Unix timestamps
- Transaction values may need conversion based on token decimals

## Constraints
- Respect the step's \`constraints\` field
- Use pagination for large result sets (default: 100 items per page)
- Target the correct chain based on scope

# Important Rules
1. **Output only one action at a time**
2. **Output JSON only** - no markdown, no explanation outside JSON
3. **Always include a "thought" field** explaining your reasoning
4. **Track progress** - avoid repeating the same queries
5. **Be efficient** - combine information from multiple results before deciding
6. **Respect constraints** - follow any limitations specified in the step

# Chart Generation Requirements

**IMPORTANT**: When the step goal involves creating charts or visualizations, you MUST use \`USE_SKILL\` to call the appropriate chart generation skills. Do NOT use \`UPDATE_SCOPE\` to just save chart configuration.

## Chart Generation Skills Available:
- \`CREATE_LINE_CHART\` - Line charts for trends over time
- \`CREATE_BAR_CHART\` - Bar charts for comparisons
- \`CREATE_PIE_CHART\` - Pie charts for proportions
- \`CREATE_RADAR_CHART\` - Radar charts for multi-dimensional analysis
- \`CREATE_FUNNEL_CHART\` - Funnel charts for flow analysis
- \`CREATE_SCATTER_CHART\` - Scatter plots for correlations
- \`CREATE_AREA_CHART\` - Area charts for cumulative trends
- \`CREATE_GAUGE_CHART\` - Gauge charts for metrics
- \`CREATE_HEATMAP_CHART\` - Heatmaps for density analysis

## Correct Chart Generation Example:

\`\`\`json
{
  "thought": "The user wants to visualize the fund flow patterns. I will create a funnel chart showing the distribution of transactions.",
  "action_type": "USE_SKILL",
  "skill_name": "CREATE_FUNNEL_CHART",
  "params": {
    "title": "Fund Flow Analysis",
    "data": [
      { "name": "Incoming Transactions", "value": 120 },
      { "name": "Outgoing Transactions", "value": 95 },
      { "name": "Unique Recipients", "value": 45 }
    ]
  }
}
\`\`\`
`;
}

/**
 * Generate observation message from skill execution result
 * @param {Object} result - The API result
 * @param {string} skillName - Name of the skill executed
 * @returns {Object} - Formatted observation
 */
export function formatObservation(result, skillName) {
    // Defensive check for null/undefined result
    if (!result) {
        console.error("[ERROR] formatObservation: result is null/undefined", {
            skillName,
        });
        return {
            type: "OBSERVATION",
            content: {
                skill: skillName,
                success: false,
                error: "No result returned from skill",
            },
        };
    }

    const isSuccess = result.status === "1" || result.message === "OK";

    if (isSuccess) {
        // Get data safely
        const data = result.result !== undefined ? result.result : null;

        // Count safely (only for arrays)
        let count = null;
        if (Array.isArray(data)) {
            count = data.length;
        }

        return {
            type: "OBSERVATION",
            content: {
                skill: skillName,
                success: true,
                data: data,
                count: count,
            },
        };
    } else {
        // Format error message safely
        let errorMsg = "Unknown error";
        if (result.message) {
            errorMsg = result.message;
        } else if (result.result !== undefined) {
            try {
                errorMsg = typeof result.result === 'string'
                    ? result.result
                    : JSON.stringify(result.result);
            } catch (error) {
                console.error("[ERROR] formatObservation: failed to stringify result.result", {
                    skillName,
                    error: error.message,
                    stack: error.stack,
                });
                errorMsg = String(result.result);
            }
        }

        return {
            type: "OBSERVATION",
            content: {
                skill: skillName,
                success: false,
                error: errorMsg,
            },
        };
    }
}
