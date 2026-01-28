import readline from "node:readline";
import { prompt } from "./prompt.js";

export class QuestionAgent {
    constructor(callLLM) {
        this.infos = {
            user_questions: null,
            goal: null,
            basic_infos: null,
        };
        this.callLLM = callLLM;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        // ReAct 模式：只保存对话历史摘要，不传递完整消息
        this.conversationHistory = [];
    }

    getinfos() {
        return this.infos;
    }

    // 检查 infos 是否还有 null 值
    hasNullInfos() {
        return Object.values(this.infos).some((v) => v === null);
    }

    // 检查信息是否足够丰富（不只是非空，还要有足够的内容）
    isInfoRichEnough() {
        if (this.hasNullInfos()) return false;

        // 检查 basic_infos 是否有必要字段
        const basicInfos = this.infos.basic_infos;
        if (!basicInfos.chain || !basicInfos.tx_hash) return false;

        // 检查 goal 是否有必要字段
        const goal = this.infos.goal;
        if (!goal.analysis_type || !goal.depth) return false;

        return true;
    }

    // 深度合并对象
    mergeChanges(changes) {
        for (const key of Object.keys(changes)) {
            if (
                this.infos[key] !== null &&
                typeof this.infos[key] === "object" &&
                typeof changes[key] === "object"
            ) {
                this.infos[key] = { ...this.infos[key], ...changes[key] };
            } else {
                this.infos[key] = changes[key];
            }
        }
    }

    // ReAct 核心循环
    async react(observation) {
        // 添加观察到历史
        this.conversationHistory.push({
            role: "observation",
            content: observation,
        });

        // 调用 LLM，只传递当前状态和最新观察
        const res = await this.callLLM({
            systemPrompt: prompt(this.infos, this.conversationHistory),
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: [{ type: "text", text: observation }],
            modelProvider: "deepseek",
        });

        console.log("Thought & Action:", JSON.stringify(res, null, 2));

        // 记录 LLM 的思考和动作
        this.conversationHistory.push({ role: "action", content: res });

        // 执行动作
        return await this.executeAction(res);
    }

    // 执行 LLM 返回的动作
    async executeAction(action) {
        switch (action.action_type) {
            case "ASK":
                // 向用户提问
                console.log("问题:", action.question);
                console.log("请输入你的回答:");
                return "WAIT_USER"; // 等待用户输入

            case "UPDATE":
                // 更新信息
                this.mergeChanges(action.changes);
                console.log("更新信息:", JSON.stringify(this.infos, null, 2));
                // 继续 ReAct 循环
                await new Promise((r) => setTimeout(r, 500));
                return await this.react(
                    `信息已更新。当前状态: ${JSON.stringify(this.infos)}`
                );

            case "FINISH":
                // 检查是否完整
                if (this.hasNullInfos()) {
                    const nullFields = Object.keys(this.infos).filter(
                        (k) => this.infos[k] === null
                    );
                    console.log(
                        `⚠️ 信息不完整，缺少: ${nullFields.join(", ")}`
                    );
                    await new Promise((r) => setTimeout(r, 500));
                    return await this.react(
                        `无法结束，以下字段仍为空: ${nullFields.join(
                            ", "
                        )}。请使用 UPDATE 动作填充，或使用 ASK 向用户询问。`
                    );
                }
                // 检查信息是否足够丰富
                if (!this.isInfoRichEnough()) {
                    console.log("⚠️ 信息不够丰富，需要更多上下文");
                    await new Promise((r) => setTimeout(r, 500));
                    return await this.react(
                        `信息不够丰富。请使用 ASK 向用户询问更多上下文，如：用户是如何发现这笔交易的？有什么怀疑？希望重点关注什么？`
                    );
                }
                // 完成
                console.log("✅ 信息收集完成");
                console.log(
                    "📋 最终结果:",
                    JSON.stringify(this.infos, null, 2)
                );
                this.rl.close();
                return "DONE";

            default:
                console.log("未知动作:", action.action_type);
                return await this.react(
                    "未知动作，请使用 ASK、UPDATE 或 FINISH"
                );
        }
    }

    async run() {
        console.log("问答模块启动 (ReAct 模式)");
        console.log("请输入你的问题：");

        this.rl.on("line", async (input) => {
            if (input === "exit") {
                this.rl.close();
                return;
            }
            await this.react(`用户输入: ${input}`);
        });

        this.rl.on("close", () => {
            console.log("bye 👋");
            process.exit(0);
        });
    }
}
