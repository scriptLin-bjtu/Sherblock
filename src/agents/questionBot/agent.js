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
        this.messages = [];
    }
    getinfos() {
        return this.infos;
    }

    // 处理 LLM 响应的核心逻辑
    async processLLMResponse() {
        const res = await this.callLLM({
            systemPrompt: prompt(this.infos),
            apiKey: process.env.BIGMODEL_API_KEY,
            user_messages: this.messages,
        });
        // 调试：打印 LLM 返回的原始结果
        console.log("LLM 返回:", JSON.stringify(res, null, 2));

        if (res.state_code === 1) {
            console.log("问答模块继续提问:", res.questions);
            this.messages.push({
                type: "text",
                text: "提问:" + res.questions,
            });
            console.log("请输入你的回答:");
            // 等待用户输入，不做其他操作
        } else if (res.state_code === 2) {
            this.infos = { ...this.infos, ...res.changes };
            console.log("问答模块更新信息:", this.infos);
            this.messages.push({
                type: "text",
                text: "更新信息:" + JSON.stringify(res.changes),
            });
            // 自动添加一条消息并继续处理
            this.messages.push({
                type: "text",
                text: "请继续更新信息直到有需要用户确认的地方",
            });
            // 递归调用，继续处理
            await this.processLLMResponse();
        } else if (res.state_code === 0) {
            this.rl.close();
            console.log("问答模块结束");
            console.log("问答模块返回的信息:", this.infos);
        }
    }

    async run() {
        console.log("问答模块启动");
        console.log("请输入你的问题：");

        this.rl.on("line", async (input) => {
            if (input === "exit") {
                this.rl.close();
                return;
            }
            this.messages.push({
                type: "text",
                text: input,
            });
            await this.processLLMResponse();
        });

        this.rl.on("close", () => {
            console.log("bye 👋");
            process.exit(0);
        });
    }
}
