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
        this.rl = null; // Lazy initialization for backward compatibility
        // ReAct 模式：只保存对话历史摘要，不传递完整消息
        this.conversationHistory = [];

        // For driver-based collection mode
        this._inputResolver = null;
        this._inputPromise = null;
        this._onQuestionCallback = null;
        this._eventEmitter = null;
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
        // 必须有 chain，且 tx_hash 或 address 至少有一个
        if (!basicInfos.chain) return false;
        if (!basicInfos.tx_hash && !basicInfos.address) return false;

        // 检查 goal 是否有必要字段
        const goal = this.infos.goal;
        if (!goal.analysis_type || !goal.depth) return false;

        return true;
    }

    /**
     * 获取当前收集进度
     * @returns {Object} 进度信息
     */
    getProgress() {
        const totalFields = 3; // user_questions, goal, basic_infos
        let filledFields = 0;
        if (this.infos.user_questions !== null) filledFields++;
        if (this.infos.goal !== null) filledFields++;
        if (this.infos.basic_infos !== null) filledFields++;

        return {
            totalFields,
            filledFields,
            isRichEnough: this.isInfoRichEnough()
        };
    }

    /**
     * 检查信息收集是否完成
     * @returns {boolean}
     */
    isComplete() {
        return this.isInfoRichEnough();
    }

    /**
     * 驱动式信息收集方法
     * @param {string} [initialInput] - 初始用户输入
     * @param {Object} [options] - 配置选项
     * @param {Function} [options.onQuestion] - 问题回调函数
     * @param {EventEmitter} [options.eventEmitter] - 事件发射器
     * @returns {Promise<Object>} 收集到的 infos 对象
     */
    async collectRequirements(initialInput = null, options = {}) {
        // 保存回调和事件发射器
        this._onQuestionCallback = options.onQuestion || null;
        this._eventEmitter = options.eventEmitter || null;

        // 重置历史
        this.conversationHistory = [];

        // 如果有初始输入，开始 ReAct 循环
        if (initialInput) {
            const result = await this.react(`用户输入: ${initialInput}`);
            if (result === "DONE") {
                return this.infos;
            }
        }

        // 等待直到信息收集完成
        // 实际收集过程由 ReAct 循环处理
        // 这里返回最终的 infos
        return this.infos;
    }

    /**
     * 处理用户输入（用于驱动式模式）
     * @param {string} input - 用户输入
     */
    async handleUserInput(input) {
        if (this._inputResolver) {
            this._inputResolver(input);
            this._inputResolver = null;
        } else {
            // 没有等待中的 Promise，触发 ReAct 循环
            await this.react(`用户输入: ${input}`);
        }
    }

    /**
     * 等待用户输入
     * @private
     * @param {string} question - 问题文本
     * @returns {Promise<string>} 用户输入
     */
    async _waitForUserInput(question) {
        return new Promise((resolve, reject) => {
            // 如果有回调，使用回调
            if (this._onQuestionCallback) {
                this._onQuestionCallback(question).then(resolve).catch(reject);
                return;
            }

            // 如果有事件发射器，使用事件
            if (this._eventEmitter) {
                this._inputResolver = resolve;
                this._eventEmitter.emit('question', { question, resolve, reject });
                return;
            }

            // 默认：使用 readline（向后兼容）
            if (!this.rl) {
                this.rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });
            }

            this.rl.question(question + '\n', (answer) => {
                resolve(answer);
            });
        });
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

        // 提取解析后的动作数据
        const action = res.data || res;

        // 记录 LLM 的思考和动作
        this.conversationHistory.push({ role: "action", content: action });

        // 执行动作
        return await this.executeAction(action);
    }

    // 执行 LLM 返回的动作
    async executeAction(action) {
        switch (action.action_type) {
            case "ASK":
                // 向用户提问
                console.log("问题:", action.question);

                // 使用新的等待用户输入机制
                try {
                    const answer = await this._waitForUserInput(action.question);
                    return await this.react(`用户回答: ${answer}`);
                } catch (error) {
                    console.error("获取用户输入失败:", error.message);
                    return "WAIT_USER";
                }

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
                // 关闭 readline (if it was created)
                if (this.rl) {
                    this.rl.close();
                }
                return "DONE";

            default:
                console.log("未知动作:", action.action_type);
                return await this.react(
                    "未知动作，请使用 ASK、UPDATE 或 FINISH"
                );
        }
    }

    /**
     * Legacy run method - maintained for backward compatibility
     * @deprecated Use collectRequirements() instead
     */
    async run() {
        console.warn("⚠️  DEPRECATED: QuestionAgent.run() is deprecated. Use collectRequirements() instead.");
        console.log("问答模块启动 (ReAct 模式)");
        console.log("请输入你的问题：");

        // Initialize readline for legacy mode
        if (!this.rl) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
        }

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

/*
{
  "user_questions": "What is the specific purpose and behavioral motivation behind the transaction with hash 0xcbc154bd8f000b5e0234e8dd725ae024007e6a1ec79663e0f1b594a83bced4be on Polygon? The user knows it involves a call to UMA's OOV2 contract but wants to understand the intent behind calling that specific function.",    
  "goal": {
    "analysis_type": "behavioral motivation analysis",
    "depth": "simple report focusing on this transaction's intent and context",
    "expected_output": "a simple report explaining the transaction's purpose and the caller's motivation",  
    "focus_points": [
      "Decode and explain the specific UMA OOV2 contract function called",
      "Analyze the intent behind calling that function (e.g., price request, governance, etc.)",
      "Contextualize the transaction within typical address behavior if possible"
    ],
    "constraints": null
  },
  "basic_infos": {
    "chain": "polygon",
    "tx_hash": "0xcbc154bd8f000b5e0234e8dd725ae024007e6a1ec79663e0f1b594a83bced4be",
    "context": {
      "user_role": "third-party observer",
      "discovery_source": "noticed randomly on-chain",
      "suspicion": "looks like a usual activity for the address, no specific suspicion",
      "known_info": "The transaction is a call to UMA's OOV2 contract. The address's behavior appears typical for it.",
      "urgency": "urgent, generate as soon as possible"
    },
    "related_addresses": [],
    "time_range": null
  }
}
*/
