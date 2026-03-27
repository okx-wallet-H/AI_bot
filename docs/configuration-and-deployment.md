# H 1.0 Pro 配置与部署说明

## 一、部署目标

H 1.0 Pro 的首版采用 **Telegram Bot + Telegram Mini App + Signal Engine** 的三段式结构。其核心原则是：**服务端只负责信号生成与上下文调度，客户端负责钱包检测、本地地址派生、签名与执行确认**。这一职责拆分与 OKX Agent Trade Kit 的本地运行思路一致；官方文档明确指出其以本地进程方式运行，API Key 不离开本地，并建议优先从模拟盘开始接入。[1] OnchainOS 文档则进一步说明，Agentic Wallet 的私钥生成与签名应在可信执行环境内完成，而交易、行情与支付能力可分别由 OKX 的链上基础设施提供。[2]

## 二、推荐部署拓扑

| 层级 | 进程/组件 | 主要职责 | 是否持有用户私钥 |
| --- | --- | --- | --- |
| Telegram Bot | `bot/src/index.ts` | 响应 `/start`，拉起 Web App，注入会话上下文 | 否 |
| Mini App 前端 | `client/` | 黑金终端 UI、本地金库、收益展示、海报生成 | 是，但仅限本地加密空间 |
| Signal Engine | `signals/src/index.ts` | 输出三大引擎信号快照、订单意图与 x402 结算结构 | 否 |
| OKX 交易/链上能力 | Agent Trade Kit / OnchainOS / Connect | 行情、路由、连接、支付、后续实盘切换 | 否（应走官方安全路径） |

## 三、配置原则

所有真实密钥必须通过环境变量注入，**严禁写入前端源码、共享类型文件、Git 仓库历史或公开部署日志**。其中，Telegram Bot Token、OKX API Key、OKX Secret、Passphrase、OnchainOS Key 与 Connect 项目参数都必须视为敏感信息。用户消息中曾提供的真实凭据，应在项目验收后尽快轮换。

此外，首版默认运行于 **simulation** 模式，但结算结构必须保留真实的 **10% x402 分账字段**，并统一归集到指定 **EVM USDT** 地址。这使得后续从仿真切换到实盘时，主要变更集中在运行环境和执行器，而不是前端展示或分账模型本身。[1] [2]

## 四、建议核对的环境变量模板

下表汇总了当前项目应保留的主要配置项。为便于总工核对，我同时给出了一份可直接复制的 **`.env.example` 建议内容**。如果当前托管环境不允许直接维护 `.env.example` 文件，可将下列内容保存在内部配置文档，或在管理面板的 Secrets 区逐项录入。

| 分组 | 变量名 | 用途 | 示例 |
| --- | --- | --- | --- |
| Telegram | `TELEGRAM_BOT_TOKEN` | Bot 启动令牌 | `123456:ABC...` |
| Telegram | `TELEGRAM_BOT_USERNAME` | Bot 用户名 | `h1pro_bot` |
| Telegram | `TMA_WEBAPP_URL` | Mini App 线上地址 | `https://your-miniapp-domain.example.com/` |
| Runtime | `H1_EXECUTION_MODE` | 运行模式 | `simulation` |
| Runtime | `H1_COMMISSION_RATE` | 分账比例 | `0.1` |
| Runtime | `COLLECTOR_EVM_ADDRESS` | EVM 统一归集地址 | `0x463b41d75e1018ba7a0a62f421219558ee13a7b4` |
| OKX | `OKX_ENV` | demo/live 环境切换 | `demo` |
| OKX | `OKX_SITE` | 站点区域 | `global` |
| OKX | `OKX_API_KEY` | 交易 API Key | `your_okx_api_key` |
| OKX | `OKX_SECRET_KEY` | 交易 Secret | `your_okx_secret_key` |
| OKX | `OKX_PASSPHRASE` | 交易口令 | `your_okx_passphrase` |
| OKX | `OKX_PROXY_URL` | 可选代理 | `http://proxy.example.com:8080` |
| OnchainOS | `OKX_ONCHAINOS_API_KEY` | 链上/技能 API Key | `your_onchainos_api_key` |
| OnchainOS | `OKX_ONCHAINOS_API_SECRET` | 链上 API Secret | `your_onchainos_api_secret` |
| Connect | `OKX_CONNECT_PROJECT_ID` | 钱包连接项目 ID | `your_okx_connect_project_id` |
| Frontend | `VITE_H1_EXECUTION_MODE` | 前端模式展示 | `simulation` |
| Frontend | `VITE_COLLECTOR_EVM_ADDRESS` | 前端显示的归集地址 | `0x463b41...a7b4` |

下面是建议的模板正文：

```dotenv
# H 1.0 Pro environment template
# 所有真实密钥仅填写在本地 .env 或托管平台 Secrets 中，不要提交到 GitHub。

# Telegram Mini App / Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TMA_APP_NAME=H 1.0 Pro
TMA_WEBAPP_URL=https://your-miniapp-domain.example.com/

# H 1.0 Pro runtime
H1_EXECUTION_MODE=simulation
H1_COMMISSION_RATE=0.1
COLLECTOR_EVM_ADDRESS=0x463b41d75e1018ba7a0a62f421219558ee13a7b4
H1_SETTLE_ASSET=USDT
H1_SETTLE_CHAIN=EVM

# OKX Exchange / Agent Trade Kit
OKX_ENV=demo
OKX_SITE=global
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase
OKX_PROJECT_PASSPHRASE=optional_project_passphrase
OKX_PROXY_URL=

# OKX OnchainOS / Connect
OKX_CONNECT_PROJECT_ID=your_okx_connect_project_id
OKX_CONNECT_REDIRECT_URL=https://your-miniapp-domain.example.com/callback
OKX_ONCHAINOS_API_KEY=your_onchainos_api_key
OKX_ONCHAINOS_API_SECRET=your_onchainos_api_secret
OKX_ONCHAINOS_BASE_URL=https://web3.okx.com

# Signal engine controls
SIGNAL_SUPPORTED_CHAINS=arbitrum,base,solana
SIGNAL_SUPPORTED_ASSETS=BTC,ETH,SOL,USDT,USDC
SIGNAL_ARBITRAGE_EDGE_BPS_MIN=20
SIGNAL_CROSSCHAIN_EDGE_TRIGGER=0.8
SIGNAL_ENABLE_PERPS=true
SIGNAL_ENABLE_BRIDGE=true
SIGNAL_DEX_PRIMARY=uniswap_v3,okx_dex

# Frontend local wallet / crypto vault behavior
VITE_APP_TITLE=H 1.0 Pro
VITE_TELEGRAM_APP_NAME=H 1.0 Pro
VITE_COLLECTOR_EVM_ADDRESS=0x463b41d75e1018ba7a0a62f421219558ee13a7b4
VITE_H1_EXECUTION_MODE=simulation
VITE_H1_COMMISSION_RATE=0.1
VITE_OKX_CONNECT_PROJECT_ID=your_okx_connect_project_id
VITE_ENABLE_LOCAL_VAULT=true
VITE_ENABLE_OKX_WALLET_DETECTION=true
VITE_TARGET_CHAINS=arbitrum,base,solana

# Optional observability
LOG_LEVEL=info
SENTRY_DSN=
UMAMI_WEBSITE_ID=
UMAMI_ENDPOINT=
```

## 五、启动与切换建议

首版建议按照以下顺序启动。首先，在本地或托管平台中注入 Telegram、OKX 与 OnchainOS 配置。其次，使用仿真配置运行 Signal Engine，并核对输出的结算对象中是否已经包含 `commissionRate=0.1`、`settleAsset=USDT`、`settleChain=EVM` 与归集地址。然后再启动 Telegram Bot，验证 `/start` 能否正常拉起 Mini App。最后，在 Mini App 中测试两条链路：检测到 OKX 钱包时的授权流程，以及未检测到钱包时的本地地址派生流程。

切换到实盘阶段时，应仅调整 `OKX_ENV=live` 以及相关真实 API 凭据，并将执行器从仿真信号快照切换到真实交易路由。由于当前订单意图与结算结构已经预留 x402 分账对象，因此理论上无需重写前端收益展示模块；但在切换前仍应完成专项审计，重点检查滑点控制、桥接失败回滚、永续仓位风控与佣金划转的幂等性。

## 六、当前仓库内已完成的关键交付

| 目录/文件 | 当前作用 |
| --- | --- |
| `client/src/pages/Home.tsx` | 黑金终端主界面、四大入口与本地钱包状态展示 |
| `client/src/lib/localVault.ts` | 本地地址派生与加密金库逻辑 |
| `client/src/lib/sharePoster.ts` | 收益海报 Canvas 生成逻辑 |
| `bot/src/index.ts` | Telegram Bot 入口、Web App 拉起与状态命令 |
| `signals/src/index.ts` | 仿真信号引擎、执行流与 x402 结算结构输出 |
| `shared/h1/types.ts` | 前端、Bot、Signal 共享领域模型 |
| `integration-notes.md` | 项目架构边界与官方文档核验结论 |

## 七、参考依据

> “OKX Agent Trade Kit 将 AI 助手与您的 OKX 账户直接连接。它以本地进程的方式运行在您的设备上。您的 API Key 永远不会离开本地。……建议先从模拟盘开始。”——OKX Agent 官方文档 [1]

> “Agentic Wallet 是 Agent 原生钱包的新基准——私钥生成与签名全程在可信执行环境（TEE）内完成……支付——基于 x402 协议，按需付费。”——OKX OnchainOS 官方文档 [2]

## References

[1]: https://www.okx.com/docs-v5/agent_zh/#introduction "简介 – 欧易 API接入指南 | OKX Agent"
[2]: https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos "什么是 Onchain OS | Onchain OS 文档"
