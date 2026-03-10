/**
 * Report Generation Skill
 * Generates a structured markdown analysis report from workflow context
 */

// Import callLLM from services - use a dynamic import to avoid module resolution issues
let callLLM = null;
async function getCallLLM() {
    if (!callLLM) {
        const agentModule = await import('../../../../../services/agent.js');
        callLLM = agentModule.callLLM;
    }
    return callLLM;
}

/**
 * Returns the prompt template for report generation
 * @returns {string} Report generation prompt
 */
function reportPrompt() {
    return `
你是一个专业的区块链分析报告撰写员。你的任务是根据分析过程的上下文生成一份结构化的 Markdown 报告。

## 报告结构要求

报告必须包含以下章节：

### 1. 摘要 (Summary)
- 简要概述本次分析的内容和范围
- 1-2 段话总结整个分析过程和关键发现

### 2. 分析目标 (Analysis Goals)
- 列出用户提出的需求和目标
- 说明分析的主要方向

### 3. 执行计划 (Execution Plan)
- 概述执行的步骤
- 列出每个步骤的目标和原因

### 4. 关键发现 (Key Findings)
- 从执行结果中提取最重要的信息和数据
- 按重要性排序
- 使用列表或表格形式呈现

### 5. 详细分析 (Detailed Analysis)
- 按步骤组织详细的分析结果
- 每个步骤包含：执行内容、获取的数据、分析结论

### 6. 结论 (Conclusions)
- 总结分析结果
- 提供最终结论和建议
- 指出任何需要注意的风险或异常

## Markdown 格式规范

- 使用标准的 Markdown 语法
- 使用适当的标题层级（##）
- 使用列表、表格、代码块等格式增强可读性
- 对重要信息使用加粗或引用块标记
- 保持专业、客观的语气

## 注意事项

- 报告应清晰、专业、易于理解
- 避免技术术语的过度使用，必要时提供解释
- 重点关注用户关心的问题和发现
- 如果某些步骤失败或数据不完整，应在报告中说明
`;
}

/**
 * 粗略估算字符串的 token 数量
 * @param {string} str - 输入字符串
 * @returns {number} 估算的 token 数量
 */
function estimateTokens(str) {
    if (!str) return 0;
    // 粗略估算：1 token ≈ 4 个字符（英文），中文约 1 个字符 = 1 token
    // 这里使用保守估计：字符数 * 0.4
    return Math.ceil(str.length * 0.4);
}

/**
 * 从 scope 中提取关键发现
 * @param {Object} scope - 作用域对象
 * @returns {Array} 关键发现数组
 */
function extractKeyFindings(scope) {
    if (!scope) return [];

    const findings = [];
    const skipKeys = new Set([
        'goal', 'user_address', 'sender_address', 'tx_hash',
        'chain', 'time_range', 'transaction_details',
'normal_transactions', 'internal_transactions',
        'token_transfers', 'address_balances', 'contract_details'
    ]);

    for (const [key, value] of Object.entries(scope)) {
        // 跳过已知的基本字段和大型数据字段
        if (skipKeys.has(key)) {
            continue;
        }

        // 只添加简单类型的值，或者大型数据的摘要
        if (typeof value === 'string') {
            if (value.length < 200) {
                findings.push({ [key]: value });
            } else {
                findings.push({ [key]: value.substring(0, 100) + '...' });
            }
        } else if (Array.isArray(value)) {
            findings.push({ [key]: `[Array with ${value.length} items]` });
        } else if (typeof value === 'object' && value !== null) {
            findings.push({ [key]: `[Object with ${Object.keys(value).length} keys]` });
        } else {
            findings.push({ [key]: String(value) });
        }
    }

    return findings.slice(0, 15); // 最多15个关键发现
}

/**
 * 压缩报告生成时的上下文数据
 * @param {Object} context - 原始上下文
 * @returns {Object} 压缩后的上下文
 */
function compressReportContext(context) {
    const { scope, plan, executionHistory, reviewResults } = context;

    // 压缩 scope - 只保留关键字段和摘要
    const compressedScope = {
        goal: scope?.goal,
        user_address: scope?.user_address,
        sender_address: scope?.sender_address,
        tx_hash: scope?.tx_hash,
        chain: scope?.chain,
        time_range: scope?.time_range,
        // 添加交易数量摘要
        transaction_count: {
            normal: scope?.normal_transactions?.length || 0,
            internal: scope?.internal_transactions?.length || 0,
            token: scope?.token_transfers?.length || 0
        },
        // 只保留 scope 中的关键发现
        key_findings: extractKeyFindings(scope)
    };

    // 压缩 plan - 只保留步骤摘要
    const compressedPlan = {
        total_steps: plan?.steps?.length || 0,
        steps: plan?.steps?.map((step, i) => ({
            stepIndex: i + 1,
            goal: step.goal,
            rationale: step.rationale,
            status: step.removed ? 'skipped' : 'executed'
        }))
    };

    // 压缩 executionHistory - 提取每个步骤的关键结果
    const compressedHistory = executionHistory?.map(entry => {
        const result = entry.result;

        // 提取步骤中使用的技能
        const actions = result?.history?.filter(h => h.action) || [];
        const skillsUsed = actions
            .map(a => {
                if (a.action?.type === 'USE_SKILL') {
                    return a.action.params?.skill_name || a.action.params?.skill || 'unknown';
                }
                return null;
            })
            .filter(Boolean);

        return {
            stepIndex: entry.stepIndex + 1,
            status: result?.status,
            skillsUsed: skillsUsed.slice(0, 3), // 最多显示3个技能
            actionCount: actions.length,
            timestamp: new Date(entry.timestamp).toISOString()
        };
    });

    // 压缩 reviewResults
    const compressedReviews = reviewResults?.map(entry => ({
        stepIndex: entry.stepIndex + 1,
        decision: entry.reviewResult?.decision,
        findings: entry.reviewResult?.findings
    }));

    return {
        scope: compressedScope,
        plan: compressedPlan,
        executionHistory: compressedHistory,
        reviewResults: compressedReviews
    };
}

/**
 * Generates a fallback report when LLM generation fails
 * @param {Object} context - Workflow context
 * @param {Error} error - Original error
 * @returns {string} Fallback markdown report
 */
function generateFallbackReport(context, error) {
    const { scope, plan, executionHistory } = context;

    const timestamp = new Date().toISOString();

    return `# 区块链分析报告

**生成时间**: ${timestamp}

---

## 摘要

本报告由区块链交易行为分析系统自动生成。由于报告生成服务暂时不可用，以下为简化的分析摘要。

---

## 分析目标

${scope?.goal || "分析目标未明确指定"}

---

## 执行计划

共执行了 ${plan?.steps?.length || 0} 个步骤。

${
    plan?.steps
        ?.map(
            (step, index) => `
### 步骤 ${index + 1}: ${step.goal || "未命名步骤"}
- **原因**: ${step.rationale || "未说明"}
- **状态**: ${step.removed ? "已跳过" : "已经执行"}
`
        )
        .join("") || ""
}

---

## 执行结果

${
    executionHistory
        ?.map(
            (entry, index) => `
### 步骤 ${entry.stepIndex + 1}
- **状态**: ${entry.result?.status || "未知"}
- **完成时间**: ${new Date(entry.timestamp).toLocaleString()}
`
        )
        .join("") || "没有执行记录"
}

---

## 警告

**报告生成失败**: ${error.message}

由于报告生成服务不可用，当前显示的是简化报告。请联系系统管理员或重试分析。

---

*报告生成器版本: 1.0.0*
`;
}

export default {
    name: "GENERATE_ANALYSIS_REPORT",
    description: "Generate a structured markdown analysis report from workflow context",
    category: "report",
    params: {
        required: ["scope", "plan", "executionHistory"],
        optional: ["reviewResults"]
    },
    whenToUse: [
        "Analysis workflow completed and final report is needed",
        "Summarizing blockchain analysis results",
        "Creating professional report from execution history"
    ],
    async execute(params, context) {
        // params 包含: scope, plan, executionHistory, reviewResults
        // context 包含: apiKey, chainId (本次调用不依赖 chainId)

        const { scope, plan, executionHistory, reviewResults } = params;

        // 构建上下文信息
        const contextInfo = {
            scope: scope || {},
            plan: plan || {},
            executionHistory: executionHistory || [],
            reviewResults: reviewResults || [],
        };

        try {
            // 压缩上下文以减少 token 消耗
            const compressedContext = compressReportContext(contextInfo);
            const contextJson = JSON.stringify(compressedContext, null, 2);
            const estimatedTokens = estimateTokens(contextJson);

            console.log(`[ReportSkill] 上下文压缩完成，估算 token 数量: ${estimatedTokens}`);
            console.log(`[ReportSkill] 压缩后上下文长度: ${contextJson.length} 字符`);

            // 检查是否仍然超出限制
            const maxTokens = 131072; // DeepSeek Reasoner 最大上下文
            const outputTokens = 8000;
            if (estimatedTokens > maxTokens - outputTokens) {
                console.warn(`[ReportSkill] 警告: 压缩后上下文 (${estimatedTokens} tokens) 仍可能超出限制 (${maxTokens} tokens)`);
            }

            // Get callLLM function
            const callLLMFunc = await getCallLLM();

            const res = await callLLMFunc({
                systemPrompt: reportPrompt(),
                apiKey: process.env.DEEPSEEK_API_KEY,
                user_messages: `请根据以下分析过程上下文生成一份结构化的分析报告：

## 压缩的上下文信息
${contextJson}`,
                modelProvider: "deepseek-reasoner",
                options: {
                    max_tokens: outputTokens,
                },
            });

            // 提取报告内容
            const report = res.data || res;

            // 如果返回的是字符串，直接使用；否则尝试获取 report 字段或转换为字符串
            if (typeof report === "string") {
                return report;
            } else if (report.report) {
                return report.report;
            } else {
                return JSON.stringify(report, null, 2);
            }
        } catch (error) {
            console.error(
                "[ReportSkill] Failed to generate report:",
                error.message
            );
            // 返回一个简单的错误报告
            return generateFallbackReport(contextInfo, error);
        }
    }
};
