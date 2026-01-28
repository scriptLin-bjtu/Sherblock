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

export async function callLLM({
    systemPrompt,
    apiKey,
    user_messages,
    modelProvider = "glm", // 默认使用GLM
    modelName = null, // 可选：指定具体的模型名称
}) {
    // 配置不同模型提供商的参数
    const providers = {
        glm: {
            url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            defaultModel: "glm-4.7-flash",
            headers: (key) => ({
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            }),
        },
        deepseek: {
            url: "https://api.deepseek.com/chat/completions",
            defaultModel: "deepseek-chat",
            headers: (key) => ({
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            }),
        },
    };

    // 获取指定提供商的配置，如果没有则使用GLM作为默认
    const provider = providers[modelProvider] || providers.glm;

    // 确定最终使用的模型名称
    const finalModel = modelName || provider.defaultModel;

    // 构建请求体，根据提供商调整参数
    const baseBody = {
        model: finalModel,
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
    };

    // 根据提供商添加特定参数
    let requestBody;
    if (modelProvider === "glm") {
        requestBody = {
            ...baseBody,
            thinking: {
                type: "enabled",
            },
        };
    } else if (modelProvider === "deepseek") {
        requestBody = {
            ...baseBody,
            // DeepSeek特定参数（根据需要调整）
            stream: false,
            // 可以根据需要添加其他DeepSeek支持的参数
            // 例如：max_tokens, temperature, top_p 等
        };
    } else {
        requestBody = baseBody;
    }

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

            const res = await fetch(provider.url, {
                method: "POST",
                headers: provider.headers(apiKey),
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(
                    `${modelProvider.toUpperCase()} API Error: ${
                        res.status
                    } ${errText}`
                );
            }

            const resJson = await res.json();

            // 检查响应结构
            if (
                !resJson.choices ||
                !resJson.choices[0] ||
                !resJson.choices[0].message
            ) {
                throw new Error(
                    `Invalid response structure from ${modelProvider}`
                );
            }

            let content = resJson.choices[0].message.content;

            // 清理 markdown 代码块标记（如 ```json ... ```）
            content = content
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            // 尝试解析JSON，如果失败则返回原始内容
            try {
                return JSON.parse(content);
            } catch (parseError) {
                console.warn(
                    `Failed to parse JSON response from ${modelProvider}, returning raw content:`,
                    parseError.message
                );
                return { content: content };
            }
        } catch (error) {
            lastError = error;
            console.log(
                `${modelProvider.toUpperCase()} API 请求失败 (尝试 ${attempt}/${maxRetries}):`,
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
