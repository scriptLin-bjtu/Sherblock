# ExecuteAgent V2 迁移指南

## 概述

ExecuteAgent V2 引入了全新的自适应上下文管理系统，使用 LLM 智能摘要替代了简单的截断压缩。本文档指导你如何从 V1 迁移到 V2。

## 主要变化

### 1. 核心类变更

| V1 | V2 | 说明 |
|-----|-----|------|
| `ExecuteAgent` | `ExecuteAgentV2` | 新类名，保持 V1 兼容 |
| `CompressionManager` | `AdaptiveContextManager` | 全新自适应压缩管理器 |
| `HistoryCompressor` | `LLMSmartSummarizer` | LLM 智能摘要器 |

### 2. 压缩策略变更

**V1 (旧方式)**
```javascript
// 简单截断，超过阈值直接丢弃旧记录
const MAX_HISTORY_SIZE = 20;
if (executionHistory.length > MAX_HISTORY_SIZE) {
    executionHistory = executionHistory.slice(-MAX_HISTORY_SIZE);
}
```

**V2 (新方式)**
```javascript
// 四层压缩策略，根据上下文大小自动选择
const CompressionTier = {
    NONE: "none",           // 无需压缩
    LIGHT: "light",         // 轻度截断
    MODERATE: "moderate",   // 中度压缩（原有压缩组件）
    AGGRESSIVE: "aggressive" // 激进压缩（LLM 智能摘要）
};
```

### 3. 上下文层次结构

**V1 (扁平结构)**
```
System Prompt
+ Current Scope (all data)
+ Current Step
+ Execution History (chronological list)
```

**V2 (分层结构)**
```
Layer 1: System Prompt (Cached, static)
Layer 2: Task Context (Step goal, criteria, constraints)
Layer 3: Working Memory (Recent 3-5 complete interactions)
Layer 4: Summarized History (LLM-compressed, key findings)
Layer 5: Scope State (Structured data, discoveries)
```

## 迁移步骤

### 步骤 1: 更新导入

**V1 代码:**
```javascript
import { ExecuteAgent } from "./agents/executeBot/agent.js";
```

**V2 代码:**
```javascript
import { ExecuteAgentV2 } from "./agents/executeBot/agent-v2.js";
```

### 步骤 2: 更新实例化

**V1 代码:**
```javascript
const executeAgent = new ExecuteAgent(callLLM, scopeManager, {
    compressionEnabled: true,
    compressionConfig: {
        history: {
            maxEntries: 15,
            fullWindowEntries: 5,
        },
    },
});
```

**V2 代码:**
```javascript
const executeAgent = new ExecuteAgentV2(callLLM, scopeManager, {
    // Compression thresholds (estimated tokens)
    lightThreshold: 3000,      // Below this: no compression
    moderateThreshold: 6000,   // Below this: light compression
    aggressiveThreshold: 10000, // Below this: moderate compression
    // Above aggressiveThreshold: LLM-based summarization

    // Summarization triggers
    historyEntryThreshold: 8,   // Summarize when history exceeds this
    tokenThreshold: 6000,       // or when tokens exceed this
    preserveRecentEntries: 3,   // Always keep this many recent entries
    maxSummaries: 3,            // Maximum summaries to maintain
});
```

### 步骤 3: 保留相同的执行接口

执行步骤的接口保持不变：

```javascript
// V1 和 V2 都使用相同的接口
const result = await executeAgent.executeStep(scope, currentStep);
```

### 步骤 4: 更新统计数据获取（可选）

**V1 代码:**
```javascript
const stats = executeAgent.getCompressionStats();
```

**V2 代码:**
```javascript
const stats = executeAgent.getCompressionStats();
// V2 返回更详细的统计信息，包括:
// - tierDistribution: 各压缩层级的使用次数
// - summarizationCalls: LLM 摘要调用次数
// - averageCompressionRatio: 平均压缩率
```

## 配置对比

### V1 配置选项

```javascript
{
    compressionEnabled: true,      // 是否启用压缩
    useLegacyPrompt: false,        // 是否使用旧版提示词
    compressionConfig: {
        enabled: true,
        debug: false,
        history: {
            fullWindowEntries: 5,  // 完整保留的条目数
            maxContentLength: 1000, // 单条最大长度
            maxEntries: 15,          // 最大历史条目数
            useSemanticSummary: true,
            summaryMaxLength: 200,
        },
        scope: {
            coreFields: ["basic_infos", "target_address", "chain"],
            maxArrayLength: 10,
            maxObjectKeys: 20,
            maxStringLength: 500,
        },
    },
}
```

### V2 配置选项

```javascript
{
    // 压缩阈值（基于估计的 token 数）
    lightThreshold: 3000,           // < 3k tokens: 无压缩
    moderateThreshold: 6000,        // < 6k tokens: 轻度压缩
    aggressiveThreshold: 10000,     // < 10k tokens: 中度压缩
                                    // > 10k tokens: LLM 智能摘要

    // LLM 摘要触发条件
    historyEntryThreshold: 8,       // 历史条目超过此值触发摘要
    tokenThreshold: 6000,           // 或 token 超过此值
    preserveRecentEntries: 3,       // 始终保留的近期条目数
    maxSummaries: 3,                // 最大维护摘要数

    // 继承 V1 的 scope 过滤配置
    scopeFilterConfig: {
        coreFields: ["basic_infos", "target_address", "chain"],
        maxArrayLength: 10,
        maxObjectKeys: 20,
        maxStringLength: 500,
    },
}
```

## 性能对比

| 指标 | V1 | V2 | 改进 |
|------|-----|-----|------|
| 上下文压缩策略 | 固定截断 | 自适应分层 | 更智能 |
| 长历史处理能力 | < 20 轮 | > 50 轮（依赖摘要质量） | 2.5x+ |
| 关键信息保留 | 低（直接丢弃） | 高（LLM 提取） | 显著提升 |
| 多步推理连贯性 | 易丢失 | 通过摘要保持 | 显著提升 |
| 额外 LLM 调用 | 0 | 每 8-10 轮 1 次 | 有成本 |

## 故障排除

### 问题：V2 比 V1 慢

**原因：** LLM 摘要调用增加了延迟

**解决方案：**
1. 提高触发阈值：`historyEntryThreshold: 12`
2. 提高 token 阈值：`tokenThreshold: 8000`
3. 禁用 LLM 摘要（回退到 V1 行为）：将 `aggressiveThreshold` 设为 `Infinity`

### 问题：摘要质量不高

**原因：** LLM 未能提取关键信息

**解决方案：**
1. 调整摘要 prompt（修改 `llm-summarizer.js` 中的 `buildSummarizationPrompt`）
2. 增加 `preserveRecentEntries` 保留更多上下文
3. 在关键步骤后手动触发摘要（调用 `contextManager.forceSummarization()`）

### 问题：内存使用增加

**原因：** 保存了多个摘要对象

**解决方案：**
1. 降低 `maxSummaries` 到 2 或 1
2. 启用摘要合并（已实现自动合并）

## 回滚到 V1

如果需要回滚到 V1：

```javascript
// 方式 1：继续使用 V1 导入
import { ExecuteAgent } from "./agents/executeBot/agent.js";

// 方式 2：使用 V2 但禁用所有新特性
const agent = new ExecuteAgentV2(callLLM, scopeManager, {
    lightThreshold: Infinity,
    moderateThreshold: Infinity,
    aggressiveThreshold: Infinity,
});
```

## 总结

ExecuteAgent V2 提供了显著改进的上下文管理能力：

1. **自适应压缩**：根据上下文大小自动选择合适的压缩策略
2. **LLM 智能摘要**：在关键节点使用 LLM 提取和保留关键信息
3. **分层上下文**：更清晰的信息组织，便于 LLM 理解和推理
4. **向后兼容**：保持与 V1 相同的接口，易于迁移

建议在所有新项目中使用 V2，并根据任务复杂度调整配置参数。
