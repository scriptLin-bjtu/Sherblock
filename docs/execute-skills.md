# ExecuteAgent 技能文档

ExecuteAgent 支持通过 Etherscan API 调用各类区块链数据获取技能。技能按类别组织，共 10 个类别 34 个技能。

---

## 目录

- [Account 账户相关](#account-账户相关)
- [Contract 合约相关](#contract-合约相关)
- [Transaction 交易相关](#transaction-交易相关)
- [Token 代币相关](#token-代币相关)
- [Proxy ETH RPC 代理](#proxy-eth-rpc-代理)
- [Logs 事件日志](#logs-事件日志)
- [Stats 统计数据](#stats-统计数据)
- [Gas 燃气费相关](#gas-燃气费相关)
- [Block 区块相关](#block-区块相关)
- [Nametag 地址标签](#nametag-地址标签)

---

## Account 账户相关

### GET_TRANSACTIONS
获取地址的普通交易列表

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| startblock | number | 否 | 起始区块号 |
| endblock | number | 否 | 结束区块号 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |
| sort | string | 否 | 排序方式 (asc/desc, 默认 desc) |

**使用场景：**
- 分析地址交易历史
- 查找交易模式
- 识别交易对手方
- 构建交易时间线

---

### GET_NATIVE_BALANCE
获取地址的原生代币余额（ETH/MATIC等）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| tag | string | 否 | 区块标签 (latest/pending/earliest, 默认 latest) |

**使用场景：**
- 检查地址原生代币余额
- 分析地址持仓
- 交易前验证资金

---

### GET_FUNDED_BY
获取地址的资金来源（首次资助者）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |

**使用场景：**
- 追溯地址资金来源
- 调查地址关系
- 合规与 AML 分析
- 了解地址资金链

---

### GET_INTERNAL_TRANSACTIONS
获取地址的内部交易列表

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| startblock | number | 否 | 起始区块号 |
| endblock | number | 否 | 结束区块号 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |
| sort | string | 否 | 排序方式 (asc/desc, 默认 desc) |

**使用场景：**
- 分析内部交易历史
- 跟踪合约交互
- 查找通过合约调用的 ETH 转账

---

## Contract 合约相关

### GET_CONTRACT_ABI
获取已验证合约的 ABI（应用二进制接口）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 合约地址 |

**使用场景：**
- 需要与合约交互
- 解码合约调用
- 分析合约函数

---

### GET_SOURCE_CODE
获取已验证合约的源代码

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 合约地址 |

**使用场景：**
- 审计合约
- 分析合约逻辑
- 验证合约功能

---

### GET_CONTRACT_CREATOR
获取合约的创建者地址和创建交易

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| contractaddresses | string | 是 | 合约地址（支持逗号分隔多个） |

**使用场景：**
- 识别谁部署了合约
- 查找创建交易
- 分析合约部署过程

---

## Transaction 交易相关

### GET_TX_RECEIPT_STATUS
获取交易的回执状态

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| txhash | string | 是 | 交易哈希 |

**使用场景：**
- 检查交易是否成功
- 验证交易状态
- 确认交易最终性

---

### GET_INTERNAL_TX_BY_HASH
获取指定交易哈希的内部交易列表

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| txhash | string | 是 | 交易哈希 |

**使用场景：**
- 分析交易内的内部调用
- 跟踪通过合约调用的 ETH 转账
- 调试交易执行

---

### GET_TX_STATUS
获取交易的执行状态（错误状态和错误信息）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| txhash | string | 是 | 交易哈希 |

**使用场景：**
- 检查交易是否成功执行
- 获取失败交易的错误信息
- 调试交易失败原因
- 交易监控

---

## Token 代币相关

### GET_TOKEN_BALANCE
获取指定地址的 ERC20 代币余额

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| contractaddress | string | 是 | 代币合约地址 |
| address | string | 是 | 查询地址 |
| tag | string | 否 | 区块标签 (latest/pending/earliest, 默认 latest) |

**使用场景：**
- 检查地址代币余额
- 分析代币持仓
- 验证代币数量

---

### GET_ERC20_TRANSFERS
获取地址的 ERC20 代币转账事件

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| contractaddress | string | 否 | 特定代币合约地址 |
| startblock | number | 否 | 起始区块号 |
| endblock | number | 否 | 结束区块号 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |
| sort | string | 否 | 排序方式 (asc/desc, 默认 desc) |

**使用场景：**
- 分析代币持仓和转账
- 识别 DeFi 活动
- 跟踪特定代币流动

---

### GET_ERC721_TRANSFERS
获取地址的 ERC721（NFT）转账事件

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| contractaddress | string | 否 | 特定 NFT 合约地址 |
| startblock | number | 否 | 起始区块号 |
| endblock | number | 否 | 结束区块号 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |
| sort | string | 否 | 排序方式 (asc/desc, 默认 desc) |

**使用场景：**
- 分析 NFT 持仓和转账
- 跟踪 NFT 集合活动
- 识别 NFT 交易模式

---

### GET_ERC1155_TRANSFERS
获取地址的 ERC1155 代币转账事件

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| contractaddress | string | 否 | 特定合约地址 |
| startblock | number | 否 | 起始区块号 |
| endblock | number | 否 | 结束区块号 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |
| sort | string | 否 | 排序方式 (asc/desc, 默认 desc) |

**使用场景：**
- 分析 ERC1155 代币持仓
- 跟踪多代币转账
- 监控 NFT/GameFi 活动

---

### GET_TOKEN_INFO
获取代币的详细信息（名称、符号、精度等）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| contractaddress | string | 是 | 代币合约地址 |

**使用场景：**
- 获取代币名称、符号、精度等信息
- 验证代币合约信息
- 代币研究与分析

---

### GET_TOP_TOKEN_HOLDERS
获取代币的 Top 持有者列表

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| contractaddress | string | 是 | 代币合约地址 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |

**使用场景：**
- 分析代币分布
- 寻找大户/鲸鱼地址
- 代币集中度分析

---

### GET_ADDRESS_TOKEN_BALANCE
获取地址的所有 ERC20 代币余额（地址投资组合）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| page | number | 否 | 页码 |
| offset | number | 否 | 每页数量 |

**使用场景：**
- 获取地址完整代币持仓
- 分析地址资产配置
- 计算投资组合价值
- 多代币余额查询

---

## Proxy ETH RPC 代理

### ETH_BLOCK_NUMBER
获取最新区块号

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| 无 | | | |

**使用场景：**
- 需要当前区块号
- 跟踪链高度
- 基于区块的时间计算

---

### ETH_GET_BLOCK_BY_NUMBER
根据区块号获取区块数据

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| tag | string | 是 | 区块号或标签 (latest/earliest/pending) |
| boolean | boolean | 否 | 是否返回完整交易 (默认 true) |

**使用场景：**
- 需要区块详情
- 分析区块内容
- 获取区块交易

---

### ETH_GET_TRANSACTION_BY_HASH
根据交易哈希获取交易数据

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| txhash | string | 是 | 交易哈希 |

**使用场景：**
- 需要交易详情
- 分析交易数据
- 获取原始交易信息

---

### ETH_GET_TRANSACTION_RECEIPT
根据交易哈希获取交易回执

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| txhash | string | 是 | 交易哈希 |

**使用场景：**
- 需要交易回执
- 检查交易状态
- 分析 gas 使用和日志

---

### ETH_GET_CODE
获取指定地址的字节码

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| tag | string | 否 | 区块标签 (latest/pending/earliest, 默认 latest) |

**使用场景：**
- 检查地址是否为合约
- 验证合约字节码
- 分析合约部署

---

### ETH_CALL
执行只读合约调用（不创建交易）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| to | string | 是 | 合约地址 |
| data | string | 是 | 调用数据（ABI 编码） |
| tag | string | 否 | 区块标签 (latest/pending/earliest, 默认 latest) |

**使用场景：**
- 读取合约状态
- 调用 view/pure 函数
- 模拟合约调用

---

### ETH_GAS_PRICE
获取当前 Gas 价格（单位：wei）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| 无 | | | |

**使用场景：**
- 获取当前 Gas 价格
- 估算交易成本
- RPC 方式查询 Gas

---

### ETH_GET_TRANSACTION_COUNT
获取地址的交易数量（nonce）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |
| tag | string | 否 | 区块标签 (latest/pending/earliest, 默认 latest) |

**使用场景：**
- 获取地址 nonce 用于交易签名
- 检查地址交易计数
- 判断地址是否发送过交易

---

## Logs 事件日志

### GET_LOGS
获取地址的事件日志，支持主题过滤

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 合约地址 |
| fromBlock | number | 否 | 起始区块号 |
| toBlock | number | 否 | 结束区块号 |
| topic0 | string | 否 | 事件签名（主题0） |
| topic1 | string | 否 | 主题1 |
| topic2 | string | 否 | 主题2 |
| topic3 | string | 否 | 主题3 |
| topic0_1_opr | string | 否 | topic0 和 topic1 间的关系 (and/or) |
| topic0_2_opr | string | 否 | topic0 和 topic2 间的关系 (and/or) |
| topic0_3_opr | string | 否 | topic0 和 topic3 间的关系 (and/or) |
| topic1_2_opr | string | 否 | topic1 和 topic2 间的关系 (and/or) |
| topic1_3_opr | string | 否 | topic1 和 topic3 间的关系 (and/or) |
| topic2_3_opr | string | 否 | topic2 和 topic3 间的关系 (and/or) |

**使用场景：**
- 监控合约事件
- 跟踪特定事件签名
- 分析合约活动

---

## Stats 统计数据

### GET_ETH_PRICE
获取当前 ETH 价格（USD 和 BTC）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| 无 | | | |

**使用场景：**
- 需要当前 ETH 价格
- 计算投资组合价值
- 市场分析

---

### GET_ETH_SUPPLY
获取当前 ETH 总供应量

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| 无 | | | |

**使用场景：**
- 需要 ETH 总供应量
- 代币经济学分析
- 市场研究

---

### GET_TOKEN_SUPPLY
获取 ERC20 代币的总供应量

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| contractaddress | string | 是 | 代币合约地址 |

**使用场景：**
- 需要代币总供应量
- 计算市值
- 代币经济学分析

---

### GET_TOKEN_BALANCE (Stats)
获取代币余额（历史版本）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| contractaddress | string | 是 | 代币合约地址 |
| address | string | 是 | 查询地址 |

> 注意：此技能为历史版本，建议使用 Token 类别的 GET_TOKEN_BALANCE

---

### GET_BLOCK_REWARD
获取指定区块的区块奖励和叔块奖励

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| blockno | number | 是 | 区块号 |

**使用场景：**
- 分析矿工奖励
- 计算区块激励
- 挖矿分析

---

## Gas 燃气费相关

### GET_GAS_ORACLE
获取当前 Gas 价格建议（安全、标准、快速）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| 无 | | | |

**使用场景：**
- 获取当前 Gas 价格建议
- 估算交易成本
- 选择最优 Gas 价格
- 监控网络拥堵情况

---

### GET_GAS_ESTIMATE
获取指定 Gas 价格的预计确认时间

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| gasprice | number | 是 | Gas 价格（单位：wei） |

**使用场景：**
- 估算交易确认时间
- 规划交易时机
- 比较 Gas 价格与确认时间的平衡

---

## Block 区块相关

### GET_BLOCK_BY_TIME
根据时间戳获取最接近的区块号

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| timestamp | number | 是 | Unix 时间戳 |
| closest | string | 否 | before 或 after (默认 before) |

**使用场景：**
- 根据日期时间查找区块号
- 历史数据按时间查询
- 时间戳转区块号
- 基于时间的区块链分析

---

## Nametag 地址标签

### GET_ADDRESS_TAG
获取地址的名称标签和标识

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| address | string | 是 | 以太坊地址 |

**使用场景：**
- 识别已知地址（交易所、协议等）
- 获取人类可读的地址标签
- 地址归属识别
- 合规与调查分析

---

## 技能别名映射

系统支持以下技能名称的自动映射：

| 别名 | 映射到 |
|------|--------|
| GET_NORMAL_TRANSACTIONS | GET_TRANSACTIONS |

## 支持的区块链

技能系统支持以下链（通过 chainId 参数）：
- Ethereum (1)
- Polygon (137)
- BSC (56)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- Avalanche (43114)
- 及其他 Etherscan 支持的链

## 技能开发指南

每个技能需要导出以下结构：

```javascript
export default {
    name: "SKILL_NAME",
    description: "技能描述",
    category: "category",
    params: {
        required: ["param1"],
        optional: ["param2"]
    },
    whenToUse: [
        "使用场景1",
        "使用场景2"
    ],
    async execute(params, context) {
        // 执行逻辑
        // params: 用户传入的参数
        // context: { apiKey, chainId }
        return {
            type: "OBSERVATION",
            content: {
                skill: this.name,
                success: true,
                data: result
            }
        };
    }
};
```

### 共享工具函数

从 `../../lib/etherscan-client.js` 可导入：

- `buildEtherscanUrl()` - 构建 Etherscan API URL
- `callEtherscanApi()` - 调用 Etherscan API
- `formatResult()` - 格式化成功结果
- `formatError()` - 格式化错误结果
- `normalizeParams()` - 规范化参数名（处理 LLM 常见错误）
- `compressResponse()` - 压缩响应防止上下文溢出
- `summarizeTransactions()` - 智能汇总交易数组
