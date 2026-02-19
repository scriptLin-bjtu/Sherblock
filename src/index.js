import { callLLM } from "./services/agent.js";

import { QuestionAgent } from "./agents/questionBot/agent.js";
import { PlanAgent } from "./agents/planBot/agent.js";
import { ExecuteAgent } from "./agents/executeBot/agent.js";

// Initialize agents
const questionAgent = new QuestionAgent(callLLM);
const planAgent = new PlanAgent(callLLM);
const executeAgent = new ExecuteAgent(callLLM);

// Example: Execute a single step from a plan
// Usage: await executeAgent.executeStep(scope, stepFromPlan);

// Uncomment to run different agents:
// questionAgent.run();  // Interactive question collection

// Example plan generation:
// planAgent.makePlan(`{
//   "user_questions": "分析Polygon地址0xB23d9Af50ff1a269Ec0a3De6FefdE0B4627a8338在最近三十天内的交易行为，并推断该地址背后持有者的可 能身份（如个人投资者、机构、机器人）及其潜在的投资或交易策略（例如，DeFi流动性挖矿、NFT交易、套利等）。",
//   "goal": {
//     "analysis_type": "地址行为画像与持有者策略推断",
//     "depth": "整体：地址自创建以来的历史行为概览；局部：最近三十天内的详细交易活动分析，包括交易频率、金额、主要交互对手方、与DeFi/NFT等协议的交互模式。",
//     "expected_output": "纯文本总结，包含核心发现和关键行为模式描述。",
//     "focus_points": [
//       "推断地址持有者的可能身份类型",
//       "识别其潜在的投资或交易策略",
//       "分析资金流入流出模式及主要活动领域（如DeFi, NFT）"
//     ],
//     "constraints": "无"
//   },
//   "basic_infos": {
//     "chain": "polygon",
//     "tx_hash": null,
//     "address": "0xB23d9Af50ff1a269Ec0a3De6FefdE0B4627a8338",
//     "context": {
//       "user_role": "third-party observer",
//       "discovery_source": "无意中发现（单纯好奇）",
//       "suspicion": "无具体怀疑，希望了解地址持有者意图和潜在策略",
//       "known_info": "没有其他关联地址或已知信息",
//       "urgency": "一般"
//     },
//     "related_addresses": [],
//     "time_range": "最近三十天"
//   }
// }`);
/*
{
  "scope": {
    "address": "0xB23d9Af50ff1a269Ec0a3De6FefdE0B4627a8338",
    "chain": "polygon",
    "analysis_period": "last_30_days",
    "recent_transactions": null,
    "transaction_frequency": null,
    "transaction_amounts": null,
    "counterparties": null,
    "protocol_interactions": null,
    "holder_type": null,
    "inferred_strategy": null,
    "inflow_outflow_patterns": null,
    "activity_domains": null
  },
  "steps": [
    {
      "goal": "获取地址${address}在${analysis_period}内的交易历史数据，填充${recent_transactions}",
      "rationale": "交易历史是分析行为模式的基础数据源，需要先收集以进行后续推理",
      "constraints": "数据可能不完整或存在延迟，假设数据源提供准确时间范围内的交易列表",
      "success_criteria": "${recent_transactions}被填充为非空列表，包含交易详情如时间、值、交互地址",
      "next_step_hint": "交易数据将用于频率、金额和对手方分析"
    },
    {
      "goal": "基于${recent_transactions}分析交易频率模式，填充${transaction_frequency}",
      "rationale": "交易频率可指示地址活动强度，帮助区分高频（如机器人）或低频（如个人）行为",
      "constraints": "频率计算可能忽略微小时间差异，假设交易时间戳准确",
      "success_criteria": "${transaction_frequency}被量化（如日均交易数）并描述趋势",
      "next_step_hint": "频率数据将辅助身份推断和策略分析"
    },
    {
      "goal": "基于${recent_transactions}分析交易金额分布，填充${transaction_amounts}",
      "rationale": "金额大小可反映资金规模和使用模式，如小额测试或大额投资",
      "constraints": "金额可能涉及不同代币，需统一标准或假设主要使用链上原生代币",
      "success_criteria": "${transaction_amounts}被概括为范围或典型值，并识别异常值",
      "next_step_hint": "金额模式将用于推断策略和资金流动"
    },
    {
      "goal": "识别${recent_transactions}中的主要交互对手方，填充${counterparties}",
      "rationale": "对手方可揭示关联地址网络，帮助推断持有者是否与特定实体（如交易所、协议）交互",
      "constraints": "对手方可能匿名或变化，仅分析频繁出现的地址",
      "success_criteria": "${counterparties}被列表化，包括高频交互地址和潜在类别",
      "next_step_hint": "对手方信息将影响协议交互分类和身份推断"
    },
    {
      "goal": "从${recent_transactions}中提取与DeFi、NFT等协议的交互，填充${protocol_interactions}",
      "rationale": "协议交互模式直接关联活动领域（如DeFi挖矿、NFT交易），是策略推断的关键",
      "constraints": "协议识别依赖于交易数据中的合约地址，可能存在未知或混合交互",
      "success_criteria": "${protocol_interactions}被分类为协议类型（如DeFi、NFT）和交互频率",
      "next_step_hint": "协议数据将用于定义${activity_domains}和推断策略"
    },
    {
      "goal": "基于${transaction_frequency}、${counterparties}、${protocol_interactions}推断地址持有者身份类型，填充${holder_type}",
      "rationale": "行为模式可映射到典型身份（如机器人高频、机构大额、个人分散），完成身份分析目标",
      "constraints": "推断是概率性的，基于常见模式，可能无法确定唯一身份",
      "success_criteria": "${holder_type}被分配为可能类型（如个人投资者、机构、机器人）并附置信度",
      "next_step_hint": "身份推断将指导策略分析和总结"
    },
    {
      "goal": "基于${protocol_interactions}和交易模式推断潜在投资或交易策略，填充${inferred_strategy}",
      "rationale": "策略是行为背后的意图（如套利、流动性挖矿），完成用户请求的核心分析",
      "constraints": "策略可能重叠或变化，仅基于观察数据推断主导模式",
      "success_criteria": "${inferred_strategy}被描述为策略类型（如DeFi流动性挖矿、NFT交易）并关联证据",
      "next_step_hint": "策略结果将融入最终行为总结"
    },
    {
      "goal": "分析${recent_transactions}中的资金流入流出模式，填充${inflow_outflow_patterns}",
      "rationale": "资金流动可揭示地址的资本来源和使用，补充策略和活动领域分析",
      "constraints": "流动分析可能简化复杂交易，专注于净流向和周期性",
      "success_criteria": "${inflow_outflow_patterns}被概括为模式（如持续流入、周期性支出）并量化规模",
      "next_step_hint": "资金模式将用于验证身份和策略推断"
    },
    {
      "goal": "整合${protocol_interactions}和交易模式定义主要活动领域，填充${activity_domains}",
      "rationale": "活动领域（如DeFi、NFT）总结地址焦点，支持策略和身份推断",
      "constraints": "领域可能跨多个类别，基于交互频率和金额加权",
      "success_criteria": "${activity_domains}被列表化并排序（如主要DeFi，次要NFT）",
      "next_step_hint": "活动领域将作为最终总结的一部分"
    }
  ]
}
*/

// Example: Execute a single step using ExecuteAgent
// This demonstrates how to run one step from the plan

const exampleScope = {
    address: "0x7C7c7bDACC15A41Eb564D0eFF5164E5AB33d5ec7",
    chain: "polygon",
    analysis_period: "last_7_days",
    recent_transactions: null,
    basic_infos: {
        chain: "polygon",
        address: "0x7C7c7bDACC15A41Eb564D0eFF5164E5AB33d5ec7",
    },
};

const exampleStep = {
    goal: "获取地址交易历史数据",
    rationale: "交易历史是分析行为模式的基础数据源",
    constraints: "数据可能不完整",
    success_criteria: "recent_transactions被填充为非空列表",
    next_step_hint: "交易数据将用于频率、金额和对手方分析",
};

// Run the step execution:
const result = await executeAgent.executeStep(exampleScope, exampleStep);
console.log("Step result:", result);
