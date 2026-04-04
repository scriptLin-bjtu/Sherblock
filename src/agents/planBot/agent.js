import { prompt as promptSerial } from "./prompt-serial.js";
import { prompt as promptParallel } from "./prompt-parallel.js";

/**
 * 根据执行模式获取对应的 prompt 函数
 * @param {string} executionMode - 'serial' 或 'parallel'
 * @returns {Function} prompt 函数
 */
function getPromptForMode(executionMode) {
    return executionMode === 'parallel' ? promptParallel : promptSerial;
}

/**
 * 尝试修复截断的 JSON
 * @param {string} jsonStr - 可能截断的 JSON 字符串
 * @returns {Object|null} 修复后的对象，或 null 如果修复失败
 */
function tryFixTruncatedJSON(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return null;

    // 尝试直接解析
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        // 继续尝试修复
    }

    // 尝试 1: 补全截断的数组/对象
    try {
        let fixed = jsonStr;
        // 补全缺失的引号
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;

        // 补全花括号
        while (openBraces > closeBraces) {
            fixed += '}';
            closeBraces++;
        }
        // 补全方括号
        while (openBrackets > closeBrackets) {
            fixed += ']';
            closeBrackets++;
        }

        return JSON.parse(fixed);
    } catch (e) {
        // 继续尝试
    }

    // 尝试 2: 查找最后一个完整的 JSON 对象
    try {
        const match = jsonStr.match(/\{[\s\S]*\}$/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (e) {
        // 继续尝试
    }

    return null;
}

/**
 * 解析计划响应，支持新旧格式
 * @param {Object} response - LLM响应
 * @returns {Object} 解析后的计划对象
 */
function parsePlanResponse(response) {
    let data = response.data || response;

    // 处理 content 字段（LLM 返回的 JSON 字符串）
    if (data.content && typeof data.content === 'string') {
        let parsedContent = null;
        let parseError = null;

        // 第一次尝试：直接解析
        try {
            parsedContent = JSON.parse(data.content);
        } catch (e) {
            parseError = e.message;
            // 第二次尝试：修复截断的 JSON
            parsedContent = tryFixTruncatedJSON(data.content);
        }

        if (parsedContent) {
            // 将解析后的内容与原始数据合并，解析的内容优先
            data = { ...data, ...parsedContent };
        } else {
            console.error('[PlanAgent] Failed to parse content JSON:', parseError);
            // 如果解析失败，尝试直接使用 content 字符串
            return {
                content: data.content,
                usage: data.usage
            };
        }
    }

    // 兼容旧格式（steps 数组）
    if (data.steps && !data.nodes) {
        return convertLegacyFormat(data);
    }

    // 新格式：nodes 对象
    // 添加默认 step_id 生成
    if (data.nodes) {
        const nodes = {};
        const steps = [];
        let stepIndex = 1;

        for (const [key, node] of Object.entries(data.nodes)) {
            const stepId = node.step_id || key || `step_${stepIndex}`;
            const processedNode = {
                ...node,
                step_id: stepId,
                outputs: node.outputs || [],
                depends_on: node.depends_on || []
            };
            nodes[stepId] = processedNode;
            steps.push(processedNode);
            stepIndex++;
        }

        return {
            scope: data.scope,
            steps,  // 保留 steps 数组以兼容状态机检查
            nodes,
            edges: data.edges || []
        };
    }

    // 兜底：返回原始数据
    return data;
}

/**
 * 将旧格式（steps数组）转换为新格式（图结构）
 * @param {Object} legacyPlan - 旧格式计划
 * @returns {Object} 新格式计划
 */
function convertLegacyFormat(legacyPlan) {
    const nodes = {};
    const edges = [];

    legacyPlan.steps.forEach((step, index) => {
        const stepId = step.step_id || `step_${index + 1}`;
        nodes[stepId] = {
            ...step,
            id: stepId,
            step_id: stepId,
            outputs: step.outputs || [],
            depends_on: step.depends_on || []
        };

        // 从 depends_on 构建 edges
        if (step.depends_on && Array.isArray(step.depends_on)) {
            step.depends_on.forEach(dep => {
                edges.push({ from: dep, to: stepId });
            });
        }
    });

    return {
        scope: legacyPlan.scope,
        steps: legacyPlan.steps,  // 保留 steps 数组以兼容状态机检查
        nodes,
        edges
    };
}

/**
 * Review prompt for step execution review
 */
const reviewPrompt = () => `You are a plan reviewer evaluating the just-completed execution step.

Please analyze the execution results and return JSON with the following structure:
{
  "assessment": "success|partial|failure",
  "findings": "Summary of key findings",
  "decision": "CONTINUE|MODIFY_PLAN|ADD_STEPS|REMOVE_STEPS|REORDER|TERMINATE",
  "adjustments": [
    {
      "type": "add|modify|remove|reorder",
      "stepIndex": 0,
      "step": { ... }, // for add/modify
      "newOrder": [0, 2, 1] // for reorder
    }
  ],
  "reason": "Reason for the decision",
  "nextStepRecommendation": "continue|continue_with_modifications|pause|terminate"
}

Assessment criteria:
- success: Step completed fully, all success criteria met
- partial: Step partially successful, with limitations or partial data
- failure: Step failed, criteria not met

Decision options:
- CONTINUE: Proceed to next step
- MODIFY_PLAN: Plan needs modification
- ADD_STEPS: Add new steps
- REMOVE_STEPS: Remove some steps
- REORDER: Reorder steps
- TERMINATE: Terminate workflow
`;

export class PlanAgent {
    constructor(callLLM) {
        this.callLLM = callLLM;
        this.plan = null;
    }

    /**
     * 创建执行计划
     * @param {Object} infos - 用户输入信息
     * @param {string|null} capabilitiesDoc - 技能能力描述
     * @param {string} executionMode - 执行模式：'serial' 或 'parallel'（默认 'serial'）
     * @returns {Promise<Object>} 计划对象
     */
    async makePlan(infos, capabilitiesDoc = null, executionMode = 'serial') {
        const promptFn = getPromptForMode(executionMode);

        const res = await this.callLLM({
            systemPrompt: promptFn(capabilitiesDoc),
            apiKey: process.env.DEEPSEEK_API_KEY,
            user_messages: `请根据已知信息生成分析计划：${JSON.stringify(
                infos,
                null,
                2
            )}`,
            modelProvider: "deepseek-reasoner",
            options: {
                max_tokens: 32000,
            },
        });

        // 使用新的解析函数，支持新旧格式
        this.plan = parsePlanResponse(res);

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

        // 防御性检查：确保所有必要字段都被定义
        if (!step || !executionResult) {
            console.error('[PlanAgent] reviewStep: Invalid parameters - step or executionResult is undefined');
            return {
                assessment: 'failure',
                findings: 'Invalid parameters: step or executionResult is undefined',
                decision: 'CONTINUE',
                adjustments: [],
                reason: 'Cannot perform review with invalid parameters',
                nextStepRecommendation: 'continue'
            };
        }

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

        // 防御性检查：确保返回的数据是对象
        if (!data || typeof data !== 'object') {
            console.error('[PlanAgent] reviewStep: Invalid LLM response - data is not an object');
            return {
                assessment: 'failure',
                findings: 'Invalid LLM response format',
                decision: 'CONTINUE',
                adjustments: [],
                reason: 'LLM did not return valid JSON object',
                nextStepRecommendation: 'continue'
            };
        }

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
        if (!adjustments || (Array.isArray(adjustments) && adjustments.length === 0)) {
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
