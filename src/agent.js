import { spawn } from "node:child_process";
/**
 * 调用 BigModel 多模态 Chat Completions 接口
 * @param {Object} params
 * @param {string} params.apiKey - BigModel API Key
 * @param {string} params.imageUrl - 图片 URL
 * @param {string} params.text - 用户文本问题
 * @returns {Promise<Object>} 接口返回结果
 */
import { systemPrompt } from "./system_prompt.js";
import "dotenv/config";
export async function callBigModelVision({ apiKey, text, imageUrl = null }) {
    const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    const body = {
        model: "glm-4.6v-flash",
        messages: [
            {
                role: "system",
                content: systemPrompt,
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
        response_format: {
            type: "json_object",
        },
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

export async function run(text) {
    //初始问题
    const result = JSON.parse(
        await callBigModelVision({
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
        do {
            step_result = JSON.parse(
                await callBigModelVision({
                    apiKey: process.env.BIGMODEL_API_KEY,
                    text: JSON.stringify(PlanObj),
                })
            );
            console.log("step result:", step_result);
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
            if (step_result.final_answer) {
                console.log("final answer:", step_result.final_answer);
                return;
            }
            console.log("plan:", PlanObj);
        } while (PlanObj.current_step < PlanObj.plan.length);
    } else {
        console.log("error response by LLM");
        return;
    }
}
