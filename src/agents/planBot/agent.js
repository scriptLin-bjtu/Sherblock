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
- TERMINATE: 终止工作流

**重要：报告生成步骤的专门审查**

如果当前审查的步骤是报告生成步骤（步骤的 goal 包含"报告"、"report"、"分析报告"等关键词），请进行以下额外检查：

1. **图表引用检查**：
   - 检查报告中是否包含图片引用（使用 Markdown 格式 \`![描述](路径)\`）
   - 如果 scope 中有 generated_charts 数组，检查报告中是否引用了所有这些图表
   - 如果存在 visualization_data，检查是否正确引用

2. **路径格式检查**：
   - 图片引用路径必须是相对路径 \`../charts/文件名.png\` 格式
   - 不能使用绝对路径或错误的相对路径

3. **完整性检查**：
   - 如果图表应该存在但报告中没有引用，视为 \`partial\` 或 \`failure\`
   - 如果路径格式错误，视为 \`partial\`，需要修复

如果发现图表相关问题，设置：
- \`assessment\`: "failure"（严重问题）或 "partial"（可修复问题）
- \`findings\`: 详细描述发现的问题
- \`decision\`: "ADD_STEPS"
- \`adjustments\`: 添加一个修复步骤，目标为修复报告中的图表引用问题

修复步骤示例：
{
  "type": "add",
  "step": {
    "goal": "修复报告中的图表引用",
    "rationale": "报告生成后检测到图表引用问题：[具体问题描述]",
    "actions": ["重新生成报告并确保正确引用所有图表"]
  }
}`;

export class PlanAgent {
    constructor(callLLM) {
        this.callLLM = callLLM;
        this.plan = null;
    }

    async makePlan(infos, capabilitiesDoc = null) {
        const res = await this.callLLM({
            systemPrompt: prompt(capabilitiesDoc),
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

        // 检查是否是报告生成步骤，如果是则进行图表验证
        const isReportGenerationStep = this._isReportGenerationStep(step);

        if (isReportGenerationStep) {
            console.log('[PlanAgent] Reviewing report generation step - checking chart references');

            try {
                // 获取报告内容
                const reportContent = this._extractReportContent(executionResult);
                if (!reportContent) {
                    console.warn('[PlanAgent] Could not extract report content from execution result');
                } else {
                    // 动态导入依赖
                    const { workspaceManager } = await import('../../utils/workspace-manager.js');
                    const { access } = await import('fs/promises');
                    const { join } = await import('path');

                    // 验证图表引用
                    const chartsPath = workspaceManager.getChartsPath();
                    const validation = await this._validateChartReferences(
                        reportContent,
                        currentScope,
                        chartsPath,
                        { access, join }
                    );

                    console.log('[PlanAgent] Chart validation result:', JSON.stringify(validation, null, 2));

                    // 如果有问题，返回修复建议
                    if (validation.hasIssues) {
                        return this._generateChartFixResponse(validation, step, currentPlan);
                    }
                }
            } catch (error) {
                console.error('[PlanAgent] Error validating chart references:', error.message);
                // 不中断不流程，继续使用通用 LLM review
            }
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

    /**
     * 判断是否是报告生成步骤
     * @param {Object} step - 步骤对象
     * @returns {boolean}
     */
    _isReportGenerationStep(step) {
        const goal = step?.goal?.toLowerCase() || '';
        return goal.includes('报告') ||
               goal.includes('report') ||
               goal.includes('分析报告') ||
               (goal.includes('generate') && goal.includes('report'));
    }

    /**
     * 从执行结果中提取报告内容
     * @param {Object} executionResult - 执行结果
     * @returns {string|null} 报告内容
     */
    _extractReportContent(executionResult) {
        // 尝试多种可能的路径
        if (typeof executionResult === 'string') {
            return executionResult;
        }

        if (executionResult?.content && typeof executionResult.content === 'string') {
            return executionResult.content;
        }

        if (executionResult?.report && typeof executionResult.report === 'string') {
            return executionResult.report;
        }

        if (executionResult?.result && typeof executionResult.result === 'string') {
            return executionResult.result;
        }

        // 从历史中提取
        const history = executionResult?.history || [];
        for (const entry of history) {
            if (entry?.observation && typeof entry.observation === 'string' &&
                (entry.observation.includes('##') || entry.observation.includes('# 区块链分析报告'))) {
                return entry.observation;
            }
        }

        return null;
    }

    /**
     * 验证报告中的图表引用
     * @param {string} reportContent - 报告内容
     * @param {Object} scope - 当前作用域
     * @param {string} chartsPath - 图表目录的绝对路径
     * @param {Object} fsModules - 文件系统模块（access, join）
     * @returns {Promise<Object>} 验证结果
     */
    async _validateChartReferences(reportContent, scope, chartsPath, { access, join }) {
        const issues = [];
        const expectedCharts = [];
        const foundReferences = [];

        // 1. 提取 scope 中应该存在的图表信息
        if (Array.isArray(scope?.generated_charts)) {
            scope.generated_charts.forEach((chart) => {
                const filename = chart.file_path?.split(/[\/\\]/).pop();
                if (filename) {
                    expectedCharts.push({
                        filename,
                        chartType: chart.chart_type,
                        description: chart.description || chart.title
                    });
                }
            });
        }

        // 1.1 从 visualization_data 中提取图表信息（兼容旧版）
        if (scope?.visualization_data && typeof scope.visualization_data === 'object') {
            Object.entries(scope.visualization_data).forEach(([key, chartData]) => {
                if (chartData && chartData.file_path && chartData.chart_type) {
                    const filename = chartData.file_path.split(/[\/\\]/).pop();
                    if (filename && !expectedCharts.some(c => c.filename === filename)) {
                        expectedCharts.push({
                            filename,
                            chartType: chartData.chart_type,
                            description: chartData.description || chartData.title
                        });
                    }
                }
            });
        }

        // 2. 从报告中提取所有图片引用
        const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        while ((match = markdownImageRegex.exec(reportContent)) !== null) {
            const altText = match[1];
            const imagePath = match[2];
            foundReferences.push({ altText, imagePath });
        }

        // 3. 检查路径格式（必须是 ../charts/xxx.png）
        foundReferences.forEach(ref => {
            if (!ref.imagePath.startsWith('../charts/')) {
                issues.push({
                    type: 'invalid_path_format',
                    message: `图片路径格式错误: "${ref.imagePath}" 应该是 "../charts/xxx.png" 格式`,
                    imagePath: ref.imagePath,
                    suggestion: `../charts/${ref.imagePath.split(/[\/\\]/).pop()}`
                });
            }
        });

        // 4. 检查引用的图片文件是否存在
        for (const ref of foundReferences) {
            // 提取文件名
            const filename = ref.imagePath.split(/[\/\\]/).pop();
            const fullPath = join(chartsPath, filename);

            try {
                await access(fullPath);
                // 文件存在，记录
            } catch (error) {
                issues.push({
                    type: 'file_not_found',
                    message: `引用的图片文件不存在: ${filename}`,
                    imagePath: ref.imagePath,
                    expectedPath: fullPath
                });
            }
        }

        // 5. 检查是否遗漏了应该引用的图表
        const referencedFiles = foundReferences
            .map(r => r.imagePath.split(/[\/\\]/).pop())
            .filter(Boolean);

        expectedCharts.forEach(chart => {
            if (!referencedFiles.includes(chart.filename)) {
                issues.push({
                    type: 'missing_reference',
                    message: `报告中缺少图表引用: ${chart.filename} (${chart.description})`,
                    missingFile: chart.filename,
                    chartType: chart.chart_type
                });
            }
        });

        return {
            hasIssues: issues.length > 0,
            issues,
            expectedCharts,
            foundReferences
        };
    }

    /**
     * 生成图表修复响应
     * @param {Object} validation - 验证结果
     * @param {Object} step - 当前步骤
     * @param {Object} currentPlan - 当前计划
     * @returns {Object} 修复响应
     */
    _generateChartFixResponse(validation, step, currentPlan) {
        const issuesSummary = validation.issues
            .map(issue => issue.message)
            .join('; ');

        const nextStepIndex = currentPlan?.steps?.length || 0;

        return {
            assessment: 'failure',
            findings: `报告生成步骤发现图表引用问题：${issuesSummary}`,
            decision: 'ADD_STEPS',
            adjustments: [
                {
                    type: 'add',
                    stepIndex: nextStepIndex,
                    step: {
                        goal: '修复报告中的图表引用',
                        rationale: `检测到以下问题：${issuesSummary}。需要重新生成报告，确保所有图表都正确引用，路径格式为 ../charts/文件名.png`,
                        actions: [
                            '检查使用 GENERATE_ANALYSIS_REPORT 技能',
                            '确保 scope 中的 generated_charts 信息完整',
                            '生成报告时正确插入图表引用'
                        ],
                        priority: 'high'
                    }
                }
            ],
            reason: '报告中的图表引用存在问题，需要修复后才能完成分析',
            nextStepRecommendation: '修复后继续'
        };
    }
}
