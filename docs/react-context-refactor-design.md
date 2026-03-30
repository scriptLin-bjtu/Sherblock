# ReAct 上下文管理重构方案

## 1. 核心架构设计

### 1.1 新的分层上下文架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Context Layers                           │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: System Prompt (Cached)                             │
│         - Agent 角色定义                                     │
│         - Skill 文档                                         │
│         - 固定指导原则                                       │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Task Context (Semi-static)                         │
│         - 当前 Step 目标                                     │
│         - Success Criteria                                   │
│         - Constraints                                        │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Working Memory (Dynamic)                           │
│         - Recent 3-5 轮完整对话                              │
│         - 关键决策点                                         │
│         - 待解决疑问                                         │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Summarized History (LLM Compressed)               │
│         - 高层执行摘要                                       │
│         - 关键发现与结论                                     │
│         - 已验证的假设                                       │
│         - 放弃的路径                                         │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: Scope State (Structured Data)                       │
│         - 已收集的关键数据                                   │
│         - 发现的地址/交易                                    │
│         - 统计摘要                                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 智能摘要工作流

```
┌──────────────────────────────────────────────────────────────┐
│                    Smart Summarization Flow                 │
└──────────────────────────────────────────────────────────────┘

   ReAct Iteration N
        │
        ▼
   ┌─────────────────┐
   │  Check Context  │──Token Count > Threshold?──┐
   │    Size         │                             │
   └─────────────────┘                             │
        │ No                                        │ Yes
        ▼                                           ▼
   ┌─────────────────┐                    ┌─────────────────┐
   │ Continue Normal │                    │ Trigger Smart │
   │      Flow       │                    │  Summarization│
   └─────────────────┘                    └────────┬────────┘
                                                   │
                        ┌──────────────────────────┼──────────┐
                        │                          │          │
                        ▼                          ▼          ▼
              ┌──────────────────┐      ┌──────────────────┐
              │ Working Memory   │      │ History to be    │
              │ (Keep Recent 3-5)│      │ Summarized       │
              └──────────────────┘      └────────┬─────────┘
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │ LLM Summarizer   │
                                       │ Generate:        │
                                       │ - Key findings   │
                                       │ - Decisions made │
                                       │ - Abandoned paths│
                                       └────────┬─────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │ Store Summary    │
                                       │ (Layer 4)        │
                                       └──────────────────┘
```

## 2. 核心组件设计

### 2.1 智能摘要器 (LLMSmartSummarizer)

```typescript
interface SmartSummary {
  // 执行摘要 - 一句话概括已完成的任务
  executiveSummary: string;

  // 关键发现 - 重要的数据发现
  keyFindings: Array<{
    type: 'data' | 'pattern' | 'anomaly' | 'correlation';
    description: string;
    dataReference?: string; // 指向 scope 中相关数据的引用
  }>;

  // 已验证的假设
  validatedHypotheses: Array<{
    hypothesis: string;
    result: 'confirmed' | 'rejected' | 'partially_confirmed';
    evidence: string;
  }>;

  // 已放弃的探索路径
  abandonedPaths: Array<{
    path: string;
    reason: 'no_data' | 'irrelevant' | 'time_constraint' | 'error';
    lastAttempt: string;
  }>;

  // 待解决疑问
  openQuestions: Array<{
    question: string;
    priority: 'high' | 'medium' | 'low';
    blocking: boolean;
  }>

  // 统计摘要
  statistics: {
    totalSkillCalls: number;
    uniqueSkillsUsed: string[];
    dataPointsCollected: number;
    executionTimeMinutes?: number;
  };
}
```

### 2.2 摘要生成 Prompt 设计

```javascript
const SMART_SUMMARY_PROMPT = `You are an expert execution summarizer for a blockchain analysis agent.
Your task is to analyze the execution history and generate a structured summary that preserves critical information while compressing the narrative.

## Input
You will receive:
1. Current Step Goal: The objective of the current execution step
2. Current Scope: The accumulated data and findings so far
3. Execution History: A sequence of actions (skill calls, scope updates) and observations (results)

## Output Format
Generate a JSON object with the following structure:

{
  "executiveSummary": "One sentence summarizing what has been accomplished",

  "keyFindings": [
    {
      "type": "data|pattern|anomaly|correlation",
      "description": "Clear description of the finding",
      "dataReference": "Path in scope where supporting data exists"
    }
  ],

  "validatedHypotheses": [
    {
      "hypothesis": "The hypothesis being tested",
      "result": "confirmed|rejected|partially_confirmed",
      "evidence": "Key evidence supporting the result"
    }
  ],

  "abandonedPaths": [
    {
      "path": "Description of the exploration path",
      "reason": "no_data|irrelevant|time_constraint|error",
      "lastAttempt": "What was last tried"
    }
  ],

  "openQuestions": [
    {
      "question": "The unanswered question",
      "priority": "high|medium|low",
      "blocking": true|false
    }
  ],

  "statistics": {
    "totalSkillCalls": 0,
    "uniqueSkillsUsed": [],
    "dataPointsCollected": 0
  }
}

## Summary Principles

1. **Preserve Critical Decisions**: Any decision that affects the analysis direction must be recorded
2. **Extract Key Data**: Identify quantitative findings and their significance
3. **Track Hypotheses**: Record what was being tested and the outcome
4. **Note Dead Ends**: Document abandoned paths to avoid re-exploration
5. **Highlight Blockers**: Flag any open questions that block progress

## Example

Input:
- Goal: "Analyze transaction patterns for address 0x123..."
- History includes: GET_NORMAL_TRANSACTIONS (found 150 txs), GET_INTERNAL_TRANSACTIONS (found 20 internal), analyzing timestamps...

Output:
{
  "executiveSummary": "Retrieved and analyzed 150 normal and 20 internal transactions, identifying daily activity patterns and gas usage trends.",
  "keyFindings": [
    {
      "type": "pattern",
      "description": "Transaction frequency peaks during UTC 14:00-16:00 consistently",
      "dataReference": "scope.transaction_patterns.hourly_distribution"
    }
  ],
  "validatedHypotheses": [
    {
      "hypothesis": "Address is an automated trading bot based on timing regularity",
      "result": "partially_confirmed",
      "evidence": "Consistent timing but also shows manual intervention patterns in gas price selection"
    }
  ],
  "statistics": {
    "totalSkillCalls": 3,
    "uniqueSkillsUsed": ["GET_NORMAL_TRANSACTIONS", "GET_INTERNAL_TRANSACTIONS"],
    "dataPointsCollected": 170
  }
}
`;
```

## 3. 重构实施计划

### Phase 1: 基础设施
1. 创建 `LLMSmartSummarizer` 类
2. 实现摘要数据结构定义
3. 添加摘要缓存机制

### Phase 2: 集成
1. 替换 `HistoryCompressor` 的压缩逻辑
2. 修改 `CompressionManager` 触发逻辑
3. 更新 `agent.js` 的 ReAct 循环

### Phase 3: 优化
1. 添加自适应触发机制（根据上下文大小动态决定触发时机）
2. 实现摘要的增量更新
3. 添加关键信息检索机制

## 4. 关键改进点总结

| 方面 | 当前方案 | 新方案 | 收益 |
|------|---------|--------|------|
| **压缩策略** | 简单截断 + 格式压缩 | LLM 智能摘要 | 保留关键决策信息 |
| **上下文结构** | 扁平历史记录 | 分层上下文 | 更好的信息组织 |
| **触发机制** | 固定阈值 | 自适应触发 | 平衡压缩率和信息完整性 |
| **可恢复性** | 无 | 摘要持久化 | 支持断点续传 |

这个方案将显著提升多轮执行时的上下文质量，使 Agent 能够在更长的时间跨度上保持连贯的推理能力。
