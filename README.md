# H 1.0 Pro

H 1.0 Pro 是一个基于 **Telegram Mini App** 架构的高端 AI 智能交易终端。当前仓库交付的是首版 **仿真执行** 方案：Telegram Bot 负责唤起 Web App 与传递会话上下文，Mini App 前端负责黑金终端界面、本地钱包检测与本地加密金库逻辑，Signal Engine 负责输出三大引擎的订单意图、执行流与 **x402** 分账结构。该职责分离与 OKX Agent Trade Kit 所强调的“本地运行、API Key 不离开本地”的安全思路一致；OnchainOS 文档则说明了 Agentic Wallet、交易、行情与支付（x402）等能力在 AI Agent 场景中的定位。[1] [2]

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `client/` | Telegram Mini App 前端，黑金终端 UI、四大核心入口、本地金库与分享海报 |
| `bot/src/index.ts` | Telegraf Bot 入口，负责 `/start`、Web App 按钮与状态说明 |
| `signals/src/index.ts` | 三大引擎仿真信号输出、执行流快照与结算对象生成 |
| `shared/h1/types.ts` | 前端、Bot、Signal 共享领域模型 |
| `integration-notes.md` | 项目业务边界、官方能力映射与阶段性架构说明 |
| `docs/configuration-and-deployment.md` | 配置、部署、环境变量模板与安全要求 |

## 当前已实现内容

当前首版已完成的核心能力包括：**黑金极简窄屏交易终端界面**、**实时执行记录**、**盈亏收益日历**、**开启智能交易的双轨入口**、**本地地址派生与加密金库逻辑**、**黑金收益海报生成**、**Telegram Bot 唤起链路**，以及 **Signal Engine 的仿真执行与 x402 分账对象输出**。其中结算结构统一以 **EVM / USDT** 归集到指定地址，并默认按 **10%** 佣金率生成净利润结果。

## 本地运行

在本地调试前，请先准备环境变量，并确保真实密钥只放在本地 `.env` 或托管平台的 Secrets 中，不进入仓库。建议配置内容与说明见 `docs/configuration-and-deployment.md`。

```bash
pnpm install
pnpm dev
```

如果需要单独验证 Bot 与仿真信号端，可使用以下命令：

```bash
pnpm bot:start
pnpm signals:snapshot
pnpm check
```

## 安全边界

本项目坚持以下安全约束：服务端不接触用户私钥；前端若未检测到 OKX 钱包，则在本地派生随机私钥并进行加密保存；所有真实 API Key、Bot Token、Passphrase 与链上凭据必须通过环境变量注入，不得硬编码进入源码或提交到 Git 历史中。该边界与 OKX Agent Trade Kit 的本地执行思路相符，也与 OnchainOS 中 Agentic Wallet 的密钥保护理念一致。[1] [2]

## 交付说明

本仓库当前以 **仿真执行 + 真实分账结构** 为首版形态，适合先核验 UI、交易触发链路、净利润展示与抽成结构是否符合预期。后续如需切换到实盘，主要工作集中在执行器接线、真实 API 凭据与风控审计，而不需要重写前端的收益展示模型或分账字段。

## References

[1]: https://www.okx.com/docs-v5/agent_zh/#introduction "简介 – 欧易 API接入指南 | OKX Agent"
[2]: https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos "什么是 Onchain OS | Onchain OS 文档"
