import { spawn } from "node:child_process";
/**
 * 调用 BigModel 多模态 Chat Completions 接口
 * @param {Object} params
 * @param {string} params.apiKey - BigModel API Key
 * @param {string} params.imageUrl - 图片 URL
 * @param {string} params.text - 用户文本问题
 * @returns {Promise<Object>} 接口返回结果
 */
import { systemPlanPrompt, systemExecutePrompt } from "./system_prompt.js";
import "dotenv/config";
export async function callBigModelVision({
    mode,
    apiKey,
    text,
    imageUrl = null,
}) {
    const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    const body = {
        model: "glm-4.6v-flash",
        messages: [
            {
                role: "system",
                content:
                    mode == "plan" ? systemPlanPrompt : systemExecutePrompt,
            },
            {
                role: "user",
                content: imageUrl
                    ? [
                          {
                              type: "image_url",
                              image_url: {
                                  url: imageUrl,
                              },
                          },
                          {
                              type: "text",
                              text,
                          },
                      ]
                    : [
                          {
                              type: "text",
                              text,
                          },
                      ],
            },
        ],
        // Disable JSON mode - it can't handle long strings with many escape characters
        // response_format: {
        //     type: "json_object",
        // },
        thinking: {
            type: "enabled",
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`BigModel API Error: ${res.status} ${errText}`);
    }
    const resJson = await res.json();
    return resJson.choices[0].message.content;
}

function runSkill(skillName, input = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn("node", [`skills/${skillName}/index.js`], {
            stdio: ["pipe", "pipe", "pipe"],
        });

        let output = "";
        let errorOutput = "";

        child.stdout.on("data", (d) => (output += d));
        child.stderr.on("data", (d) => (errorOutput += d));

        child.on("close", (code) => {
            if (code !== 0) return reject(new Error(errorOutput));
            resolve(JSON.parse(output));
        });

        child.stdin.write(JSON.stringify(input));
        child.stdin.end();
    });
}

/**
 * Fix JSON string by replacing actual newlines with \\n escape sequences
 * This handles cases where LLM returns JSON with literal newlines in string values
 */
function fixJSONString(jsonString) {
    // First, try to fix newlines
    let fixed = jsonString;

    // Match "key": "value" patterns and fix newlines within the value
    fixed = fixed.replace(
        /"([^"]+)":\s*"([\s\S]*?)"/g,
        (_match, key, value) => {
            // Replace actual newlines, tabs, and other control characters with escape sequences
            const fixedValue = value
                .replace(/\r\n/g, "\\n")
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/\t/g, "\\t");
            return `"${key}": "${fixedValue}"`;
        }
    );

    return fixed;
}

/**
 * Extract the actual response from malformed JSON
 * Sometimes LLM returns JSON where the content field is split into multiple properties
 */
function extractValidResponse(parsedObj) {
    // If it's already valid, return as is
    if (
        parsedObj.skill ||
        parsedObj.step_answer ||
        parsedObj.final_answer ||
        parsedObj.mode
    ) {
        return parsedObj;
    }

    // If it's an array, try to extract from first element
    if (Array.isArray(parsedObj)) {
        console.log(
            "Warning: LLM returned an array instead of object, using first element"
        );
        parsedObj = parsedObj[0] || {};
    }

    // Try to reconstruct the response
    if (parsedObj.params) {
        return {
            skill: parsedObj.skill || "edit_file",
            params: parsedObj.params,
        };
    }

    console.error("Unable to extract valid response from:", parsedObj);
    throw new Error("Invalid response format from LLM");
}

/**
 * Try to parse JSON with error handling and retry logic
 */
function safeJSONParse(jsonString) {
    let parsedObj;

    // First, try to extract JSON from markdown code blocks (LLM might wrap it)
    const jsonMatch =
        jsonString.match(/```json\s*([\s\S]*?)\s*```/) ||
        jsonString.match(/```\s*([\s\S]*?)\s*```/) ||
        jsonString.match(/\{[\s\S]*\}/); // Find any JSON object

    const jsonToParse = jsonMatch ? jsonMatch[1] || jsonMatch[0] : jsonString;

    try {
        parsedObj = JSON.parse(jsonToParse);
    } catch (error) {
        console.error("JSON parse error:", error.message);

        // Try to fix the JSON by escaping newlines
        try {
            const fixed = fixJSONString(jsonToParse);
            console.log("Attempting to fix JSON with newline escaping...");
            parsedObj = JSON.parse(fixed);
        } catch (fixError) {
            console.error("Failed to fix JSON");
            console.error("Raw response (first 1000 chars):");
            console.error(jsonString.substring(0, 1000));
            throw error;
        }
    }

    // Extract valid response from potentially malformed object
    return extractValidResponse(parsedObj);
}

export async function run(text) {
    //初始问题
    const result = safeJSONParse(
        await callBigModelVision({
            mode: "plan",
            apiKey: process.env.BIGMODEL_API_KEY,
            text,
        })
    );
    if (result.mode == "quick_answer") {
        //快速回复模式
        console.log("quick answer:", result.answer);
        return;
    } else if (result.mode == "plan") {
        //计划模式
        const PlanObj = result;
        const plan = PlanObj.plan;
        let skills_description = "";
        let step_result;
        let skillMap = new Map();
        for (const step of plan) {
            if (step.skill) {
                if (skillMap.has(step.skill)) {
                    continue;
                }
                skillMap.set(step.skill, 1);
                const skill = await import(`../skills/${step.skill}/des.js`);
                skills_description += `${step.skill}:${skill.description}\n`;
            }
        }
        //动态加载需要的技能描述
        PlanObj.skills_description = skills_description;
        console.log("plan:", PlanObj);

        let loopCount = 0;
        const maxLoops = plan.length + 5; // Allow a few extra loops for final_answer

        while (true) {
            loopCount++;
            if (loopCount > maxLoops) {
                console.log("Max loops reached, forcing exit");
                console.log(
                    "final answer: Task completed but LLM did not provide final_answer"
                );
                return;
            }
            const llmResponse = await callBigModelVision({
                mode: "execute",
                apiKey: process.env.BIGMODEL_API_KEY,
                text: JSON.stringify(PlanObj),
            });
            step_result = safeJSONParse(llmResponse);
            console.log("step result:", step_result);

            // Check for final answer first
            if (step_result.final_answer) {
                console.log("final answer:", step_result.final_answer);
                return;
            }

            // Check if current_step is within bounds
            if (PlanObj.current_step >= PlanObj.plan.length) {
                console.log(
                    "All steps completed, but no final_answer received. Requesting final answer..."
                );
                // Continue loop to request final_answer
                continue;
            }

            if (step_result.step_answer) {
                PlanObj.plan[PlanObj.current_step].result =
                    step_result.step_answer;
                PlanObj.current_step++;
            }
            if (step_result.skill) {
                PlanObj.plan[PlanObj.current_step].result = await runSkill(
                    step_result.skill,
                    step_result.params
                );
                PlanObj.current_step++;
            }
            console.log("plan:", PlanObj);
        }
    } else {
        console.log("error response by LLM");
        return;
    }
}
