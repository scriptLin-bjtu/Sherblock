import { spawn } from "node:child_process";
/**
 * 调用多模态 Chat Completions 接口
 * @param {Object} params
 * @param {string} params.apiKey - API Key
 * @param {string} params.systemPrompt - 系统提示词
 * @param {string} params.user_messages - 用户消息
 * @param {string} params.modelProvider - 模型提供商: "glm" | "deepseek" | "deepseek-reasoner"
 * @param {string} params.modelName - 可选：指定具体的模型名称
 * @param {Object} params.options - 可选：额外参数配置
 * @returns {Promise<Object>} 接口返回结果
 */

import "dotenv/config";

export async function callLLM({
    systemPrompt,
    apiKey,
    user_messages,
    modelProvider = "glm", // 默认使用GLM
    modelName = null, // 可选：指定具体的模型名称
    options = {}, // 新增：额外配置选项
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
        // 新增：DeepSeek Reasoner（深度思考模型）
        "deepseek-reasoner": {
            url: "https://api.deepseek.com/chat/completions",
            defaultModel: "deepseek-reasoner", // DeepSeek-V3.2 思考模式
            headers: (key) => ({
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            }),
            // Reasoner 模型限制提示
            unsupportedParams: [
                "temperature",
                "top_p",
                "presence_penalty",
                "frequency_penalty",
                "logprobs",
                "top_logprobs",
            ],
        },
    };

    // 获取指定提供商的配置，如果没有则使用GLM作为默认
    const provider = providers[modelProvider] || providers.glm;

    // 确定最终使用的模型名称
    const finalModel = modelName || provider.defaultModel;

    // 根据 provider 自动选择环境变量作为 apiKey 默认值
    const finalApiKey = apiKey || (
        modelProvider === 'deepseek' || modelProvider === 'deepseek-reasoner'
            ? process.env.DEEPSEEK_API_KEY
            : process.env.GLM_API_KEY
    );

    // 构建基础请求体
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

    switch (modelProvider) {
        case "glm":
            requestBody = {
                ...baseBody,
                thinking: {
                    type: "enabled",
                },
                // GLM 支持的标准参数
                ...(options.max_tokens && { max_tokens: options.max_tokens }),
                ...(options.temperature !== undefined && {
                    temperature: options.temperature,
                }),
                ...(options.top_p !== undefined && { top_p: options.top_p }),
            };
            break;

        case "deepseek":
            requestBody = {
                ...baseBody,
                stream: options.stream ?? false,
                // DeepSeek 标准模型支持的参数
                ...(options.max_tokens && { max_tokens: options.max_tokens }),
                ...(options.temperature !== undefined && {
                    temperature: options.temperature,
                }),
                ...(options.top_p !== undefined && { top_p: options.top_p }),
                ...(options.frequency_penalty !== undefined && {
                    frequency_penalty: options.frequency_penalty,
                }),
                ...(options.presence_penalty !== undefined && {
                    presence_penalty: options.presence_penalty,
                }),
                ...(options.seed && { seed: options.seed }),
                // 工具调用
                ...(options.tools && { tools: options.tools }),
                ...(options.tool_choice && {
                    tool_choice: options.tool_choice,
                }),
                // JSON 输出
                ...(options.response_format && {
                    response_format: options.response_format,
                }),
            };
            break;

        case "deepseek-reasoner":
            requestBody = {
                ...baseBody,
                // Reasoner 模型仅支持以下参数：
                stream: options.stream ?? false,
                // max_tokens: 控制最终回答长度（不含思维链），默认4K，最大8K
                // 注意：思维链输出最多可达32K tokens，不计入上下文长度
                ...(options.max_tokens && { max_tokens: options.max_tokens }),

                // 工具调用（思考模式下已支持）
                ...(options.tools && { tools: options.tools }),
                ...(options.tool_choice && {
                    tool_choice: options.tool_choice,
                }),

                // JSON 输出（思考模式下已支持）
                ...(options.response_format && {
                    response_format: options.response_format,
                }),

                // 注意：以下参数在 reasoner 模型中不生效，已过滤
                // temperature, top_p, presence_penalty, frequency_penalty, logprobs, top_logprobs
            };

            // 警告：如果传入了不支持的参数，打印警告
            const unsupported = [
                "temperature",
                "top_p",
                "presence_penalty",
                "frequency_penalty",
                "logprobs",
                "top_logprobs",
            ];
            const usedUnsupported = unsupported.filter(
                (param) => options[param] !== undefined
            );
            if (usedUnsupported.length > 0) {
                console.warn(
                    `[DeepSeek Reasoner] 以下参数不生效: ${usedUnsupported.join(
                        ", "
                    )}`
                );
            }
            break;

        default:
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
                headers: provider.headers(finalApiKey),
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

            const message = resJson.choices[0].message;

            // 提取内容
            let content = message.content;

            // DeepSeek Reasoner 特殊处理：提取思维链内容
            let reasoningContent = null;
            if (
                modelProvider === "deepseek-reasoner" &&
                message.reasoning_content
            ) {
                reasoningContent = message.reasoning_content;
            }

            // 清理 markdown 代码块标记（如 ```json ... ```）
            content = content
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            // 构建返回结果
            const result = {
                content: content,
                // 如果是 reasoner 模型，包含思维链
                ...(reasoningContent && {
                    reasoning_content: reasoningContent,
                }),
                // 包含 token 使用情况
                usage: resJson.usage || null,
                // 原始响应用于调试
                raw: options.includeRaw ? resJson : undefined,
            };

            // 尝试解析JSON，如果失败则返回原始内容
            try {
                const parsedContent = JSON.parse(content);
                return {
                    ...result,
                    data: parsedContent, // 解析后的数据
                };
            } catch (parseError) {
                // 如果不是JSON，返回原始内容
                return result;
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
