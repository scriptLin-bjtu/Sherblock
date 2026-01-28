import { spawn } from "node:child_process";
/**
 * 调用 BigModel 多模态 Chat Completions 接口
 * @param {Object} params
 * @param {string} params.apiKey - BigModel API Key
 * @param {string} params.imageUrl - 图片 URL
 * @param {string} params.text - 用户文本问题
 * @returns {Promise<Object>} 接口返回结果
 */

import "dotenv/config";
export async function callLLM({ systemPrompt, apiKey, user_messages }) {
    const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    const body = {
        model: "glm-4.7-flash",
        messages: [
            {
                role: "system",
                content: systemPrompt,
            },
            {
                role: "user",
                content: user_messages,
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

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`BigModel API Error: ${res.status} ${errText}`);
            }
            const resJson = await res.json();
            let content = resJson.choices[0].message.content;
            // 清理 markdown 代码块标记（如 ```json ... ```）
            content = content
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
            return JSON.parse(content);
        } catch (error) {
            lastError = error;
            console.log(
                `API 请求失败 (尝试 ${attempt}/${maxRetries}):`,
                error.message
            );
            if (attempt < maxRetries) {
                console.log(`等待 2 秒后重试...`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }
    throw lastError;
}
