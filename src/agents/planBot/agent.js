import { prompt } from "./prompt.js";

/**
 * Review prompt for step execution review
 */
const reviewPrompt = () => `你作为计划审查员，需要评估刚刚完成的执行步骤。

请分析执行结果并返回以下结构的JSON:
{
  "assessment": "success|partial|failure",
  "findings": "关键发现总结",
  "decision": "CONTINUE|MODIFY_PLAN|ADD_STEPS|REMOVE_STEPS|REORDER|TERMINATE",
  "adjustments": [
    {
      "type": "add|modify|remove|reorder",
      "stepIndex": 0,
      "step": { ... }, // for add/modify
      "newOrder": [0, 2, 1] // for reorder
    }
  ],
  "reason": "决策原因",
  "nextStepRecommendation": "继续|修改后继续|暂停|终止"
}

评估标准：
- success: 步骤完全成功，达到所有成功标准
- partial: 步骤部分成功，有局限或部分数据
- failure: 步骤失败，未达到标准

决策选项：
- CONTINUE: 继续执行下一步
- MODIFY_PLAN: 需要修改计划
- ADD_STEPS: 添加新步骤
- REMOVE_STEPS: 删除某些步骤
- REORDER: 重新排序步骤
- TERMINATE: 终止工作流`;

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

    /**
     * 审查步骤执行结果
     * @param {Object} step - 执行的步骤
     * @param {Object} executionResult - 执行结果
     * @param {Object} currentScope - 当前全局状态
     * @param {Object} currentPlan - 当前计划
     * @returns {Promise<Object>} 审查结果
     */
    async reviewStep(step, executionResult, currentScope, currentPlan) {
        const reviewData = {
            step,
            executionResult,
            currentScope,
            currentPlan
        };

        const res = await this.callLLM({
            systemPrompt: reviewPrompt(),
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: `请审查以下步骤执行结果：\n\n${JSON.stringify(reviewData, null, 2)}`,
            modelProvider: "deepseek-reasoner",
            options: {
                max_tokens: 4000,
            },
        });

        // 提取解析后的数据
        const data = res.data || res;

        console.log("步骤审查结果:", JSON.stringify(data, null, 2));
        return data;
    }

    /**
     * 应用调整更新计划
     * @param {Object} plan - 当前计划
     * @param {Array} adjustments - 调整列表
     * @returns {Object} 更新后的计划
     */
    adjustPlan(plan, adjustments) {
        if (!adjustments || adjustments.length === 0) {
            return plan;
        }

        const newPlan = { ...plan };
        if (!Array.isArray(newPlan.steps)) {
            newPlan.steps = [];
        }

        // 复制步骤数组
        newPlan.steps = [...newPlan.steps];

        for (const adjustment of adjustments) {
            switch (adjustment.type) {
                case 'add':
                    if (adjustment.step) {
                        const insertIndex = adjustment.stepIndex !== undefined
                            ? adjustment.stepIndex
                            : newPlan.steps.length;
                        newPlan.steps.splice(insertIndex, 0, adjustment.step);
                    }
                    break;

                case 'modify':
                    if (adjustment.stepIndex !== undefined && adjustment.step) {
                        newPlan.steps[adjustment.stepIndex] = {
                            ...newPlan.steps[adjustment.stepIndex],
                            ...adjustment.step
                        };
                    }
                    break;

                case 'remove':
                    if (adjustment.stepIndex !== undefined) {
                        // 标记为已删除而不是物理删除
                        newPlan.steps[adjustment.stepIndex] = {
                            ...newPlan.steps[adjustment.stepIndex],
                            removed: true
                        };
                    }
                    break;

                case 'reorder':
                    if (adjustment.newOrder && Array.isArray(adjustment.newOrder)) {
                        const reorderedSteps = adjustment.newOrder.map(i => newPlan.steps[i]);
                        newPlan.steps = reorderedSteps;
                    }
                    break;

                default:
                    console.warn(`未知的调整类型: ${adjustment.type}`);
            }
        }

        return newPlan;
    }

    /**
     * 重新排序剩余步骤
     * @param {Object} plan - 当前计划
     * @param {Array} newOrder - 新的顺序（相对于剩余步骤的索引）
     * @param {number} currentStepIndex - 当前步骤索引
     * @returns {Object} 更新后的计划
     */
    reorderRemainingSteps(plan, newOrder, currentStepIndex = 0) {
        if (!newOrder || !Array.isArray(newOrder) || newOrder.length === 0) {
            return plan;
        }

        const newPlan = { ...plan };
        newPlan.steps = [...newPlan.steps];

        // 分离已完成步骤和剩余步骤
        const completedSteps = newPlan.steps.slice(0, currentStepIndex);
        const remainingSteps = newPlan.steps.slice(currentStepIndex);

        // 验证 newOrder 的有效性
        const validIndices = newOrder.every(i => i >= 0 && i < remainingSteps.length);
        if (!validIndices) {
            throw new Error('Invalid newOrder: indices out of range');
        }

        if (newOrder.length !== remainingSteps.length) {
            throw new Error('Invalid newOrder: length mismatch');
        }

        // 重新排序剩余步骤
        const reorderedRemainingSteps = newOrder.map(i => remainingSteps[i]);

        // 合并已完成步骤和重新排序的剩余步骤
        newPlan.steps = [...completedSteps, ...reorderedRemainingSteps];

        return newPlan;
    }
}
