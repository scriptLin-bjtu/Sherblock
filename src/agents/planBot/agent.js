import { prompt } from "./prompt.js";
export class PlanAgent {
    constructor(callLLM) {
        this.callLLM = callLLM;
        this.plan = null;
    }
    async makePlan(infos) {
        const res = await this.callLLM({
            systemPrompt: prompt(),
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: `请根据已知信息生成分析计划：${JSON.stringify(
                infos,
                null,
                2
            )}`,
            modelProvider: "deepseek-reasoner",
            options: {
                max_tokens: 4000,
            },
        });

        // 提取解析后的数据
        const data = res.data || res;

        // 如果返回的是数组，直接使用；否则尝试获取 plan 字段
        this.plan = Array.isArray(data) ? data : data.plan || data;

        console.log("计划模块生成的计划:", JSON.stringify(this.plan, null, 2));
        return this.plan;
    }
}
