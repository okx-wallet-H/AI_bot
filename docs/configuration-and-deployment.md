# H 1.0 Pro 配置与部署说明

## 一、当前交付定位

H 1.0 Pro 当前采用 **Telegram Bot + Telegram Mini App + Signal Engine + tRPC 服务端** 的组合结构。其核心原则仍然是：**服务端负责信号、运行态审计、OKX 适配与上下文调度；客户端负责钱包检测、本地地址派生、签名与执行确认**。这一分层与当前 Telegram Mini App 交易终端的安全边界一致，也符合将高风险签名材料留在设备侧的设计要求。

从本轮集成结果看，项目已经从“仅保留仿真模型与环境字段”的阶段，推进到“**已可使用真实 OKX Demo Trading 凭证完成官方认证，并将联通状态回填给 bootstrap 接口**”的阶段。与此同时，**Wallet API、OnchainOS Skills / Market、Agent Trade Kit 执行器** 仍然处于缺口保留或待接入状态，因此当前版本应被定义为：**仿真优先、真实模拟盘认证已打通、真实交易执行器尚未全面落地**。[1] [2] [4] [5]

## 二、推荐部署拓扑

| 层级 | 目录/组件 | 主要职责 | 是否持有用户私钥 |
| --- | --- | --- | --- |
| Telegram Bot | `bot/src/index.ts` | 响应 `/start`、发送 Web App 按钮、注入启动上下文 | 否 |
| Mini App 前端 | `client/` | 黑金终端 UI、本地金库、收益展示、控制区与分享海报 | 是，但仅限本地加密空间 |
| Signal Engine | `signals/src/index.ts` | 输出三大引擎的订单意图、执行流与结算结构 | 否 |
| tRPC 服务端 | `server/` | 返回 bootstrap 数据、集成审计结果、后续 OKX 适配代理 | 否 |
| OKX Demo Trading | OKX REST / WS | 模拟盘账户、行情、交易与状态查询 | 否 |
| Wallet API / OnchainOS | OKX Wallet / OnchainOS Open API | 钱包鉴权、链上能力、Skills / Market / Open API | 否 |

## 三、当前集成状态判断

下表汇总当前仓库的真实接入状态，以便后续继续开发时避免“前端已有展示”与“后端已真实接入”混为一谈。

| 能力项 | 当前状态 | 结论 |
| --- | --- | --- |
| Signal Engine | 已完成 | 已能生成订单意图、执行流、结算对象与 x402 分账结构 |
| Telegram Bot 拉起 | 已完成基础链路 | 已可传递启动上下文并拉起 Mini App |
| Demo Trading 凭证认证 | 已完成 | 已通过官方账户配置接口认证，且请求头包含 `x-simulated-trading: 1` |
| Demo Trading 下单/账户驱动 | 部分完成 | 已有服务端签名与轻量探测层，但尚未形成完整下单、撤单、持仓与账户面板联动 |
| Agent Trade Kit | 未接入 | 当前代码库未发现官方 SDK 或执行器落地 |
| Wallet API | 未接入 | 当前仍停留在钱包注入检测与本地金库派生层 |
| OnchainOS Skills / Market | 未接入 | 尚未建立 Project ID、签名与 Open API 调用适配层 |
| 前端交易控制台 | 已完成基础终端化改造 | 已接入服务端 bootstrap，但尚需继续以真实审计状态驱动更多操作反馈 |

## 四、OKX Demo Trading 已验证规则

根据 OKX 官方文档与本轮实测结果，**模拟盘 REST 仍使用 `https://www.okx.com` 作为基础域名**，但必须满足两个前提：第一，使用在模拟盘控制台单独创建的 API Key；第二，在请求头中显式加入 `x-simulated-trading: 1`。如果缺少该请求头，或误用了实盘 API Key，常会导致认证失败或环境判断错误。[1] [2]

> 当前项目已经按上述规则实现了 Demo Trading 的服务端签名与请求头封装，并使用 `GET /api/v5/account/config` 完成了轻量认证验证。这意味着“模拟盘联通性”已经不是文档占位，而是可被程序化验证的真实状态。[1] [2]

Demo Trading 当前需要固定遵循的关键规则如下。

| 项目 | 当前口径 |
| --- | --- |
| REST Base URL | `https://www.okx.com` |
| 公共 WS | `wss://wspap.okx.com:8443/ws/v5/public` |
| 私有 WS | `wss://wspap.okx.com:8443/ws/v5/private` |
| 业务 WS | `wss://wspap.okx.com:8443/ws/v5/business` |
| 额外请求头 | `x-simulated-trading: 1` |
| API Key 来源 | 模拟盘页面单独创建 |
| 当前认证探测接口 | `GET /api/v5/account/config` |

## 五、Wallet API / OnchainOS 当前缺口

OnchainOS 官方文档说明，其能力边界覆盖 **Agentic Wallet、Market、Trading、Payment、Open API 与 Skills** 等链上能力，但这类接口通常需要额外的 **Project ID、API Key、Secret / Passphrase、签名规则或服务端鉴权流程**，并不等同于前端检测到钱包注入就算接入完成。[4] [5] [6]

因此，当前项目对 Wallet API 与 OnchainOS 的结论应明确表述为：

| 模块 | 当前状态 | 说明 |
| --- | --- | --- |
| Wallet 注入检测 | 已有 | 前端已能判断 OKX 钱包是否存在 |
| 本地金库派生 | 已有 | 未检测到钱包时可本地派生并加密保存地址 |
| Wallet API 账户查询 | 未有 | 尚未接入官方账户、余额、签名或授权 API |
| OnchainOS Market | 未有 | 尚未接入官方行情 / DEX / 路由能力 |
| OnchainOS Skills | 未有 | 尚未对接 Skills 运行、调用或工具执行流程 |
| Agentic Wallet / Waas Auth | 未有 | 尚未完成 Project ID / Secret / Passphrase 的服务端签名适配 |

这也意味着，前端目前展示的 **Wallet API / OnchainOS** 状态，本质上仍是**缺口审计结果的可视化**，而不是相应官方接口已经完成打通。

## 六、建议保留的环境变量清单

下面的变量名已经按当前项目真实使用口径修正，尤其修复了旧文档中仍使用泛化命名（如 `OKX_API_KEY`、`OKX_PASSPHRASE`、`OKX_ONCHAINOS_API_KEY`）的问题。后续请优先以下表为准。

| 分组 | 变量名 | 用途 | 当前状态 |
| --- | --- | --- | --- |
| Telegram | `TELEGRAM_BOT_TOKEN` | Bot 启动令牌 | 需要用户配置 |
| Telegram | `TELEGRAM_BOT_USERNAME` | Bot 用户名 | 需要用户配置 |
| Telegram | `TMA_WEBAPP_URL` | Mini App 线上地址 | 需要用户配置 |
| Runtime | `TMA_APP_NAME` | 应用名称 | 可配置 |
| Runtime | `H1_EXECUTION_MODE` | `simulation` / `production-ready` | 已使用 |
| Runtime | `H1_COMMISSION_RATE` | 分账比例 | 已使用 |
| Runtime | `COLLECTOR_EVM_ADDRESS` | 统一归集地址 | 已使用 |
| OKX Demo | `OKX_ENV` | `demo` / `live` 环境标签 | 已使用 |
| OKX Demo | `OKX_SITE` | `global` / `eea` / `us` | 已使用 |
| OKX Demo | `OKX_DEMO_API_KEY` | 模拟盘 API Key | 已验证 |
| OKX Demo | `OKX_DEMO_SECRET_KEY` | 模拟盘 Secret Key | 已验证 |
| OKX Demo | `OKX_DEMO_PASSPHRASE` | 模拟盘 Passphrase | 已验证 |
| OnchainOS | `OKX_ONCHAIN_API_KEY` | OnchainOS / Wallet Open API Key | 已预留，待联调 |
| OnchainOS | `OKX_ONCHAIN_SECRET_KEY` | OnchainOS / Wallet Open API Secret | 已预留，待联调 |
| OnchainOS | `OKX_ONCHAIN_PASSPHRASE` | OnchainOS / Wallet Open API Passphrase | 已预留，待联调 |
| OnchainOS | `OKX_ONCHAIN_PROJECT_ID` | OnchainOS / Wallet 项目 ID | 已预留，待联调 |
| Frontend | `VITE_APP_TITLE` | 前端标题 | 系统注入 |
| Frontend | `VITE_APP_LOGO` | 前端 Logo | 系统注入 |

## 七、建议 `.env` 模板正文

如果需要本地开发或导入到其他托管环境，可以以下列模板为基础。**其中所有密钥值都必须手动录入，不得写入仓库。**

```dotenv
# H 1.0 Pro environment template
# 所有真实密钥仅填写在本地 .env 或托管平台 Secrets 中，不要提交到 Git。

# Telegram Mini App / Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TMA_APP_NAME=H 1.0 Pro
TMA_WEBAPP_URL=https://your-miniapp-domain.example.com/

# Runtime
H1_EXECUTION_MODE=simulation
H1_COMMISSION_RATE=0.1
COLLECTOR_EVM_ADDRESS=0x463b41d75e1018ba7a0a62f421219558ee13a7b4
H1_SETTLE_ASSET=USDT
H1_SETTLE_CHAIN=EVM
OKX_ENV=demo
OKX_SITE=global

# OKX Demo Trading
OKX_DEMO_API_KEY=your_demo_api_key
OKX_DEMO_SECRET_KEY=your_demo_secret_key
OKX_DEMO_PASSPHRASE=your_demo_passphrase

# OKX OnchainOS / Wallet Open API
OKX_ONCHAIN_API_KEY=your_onchain_api_key
OKX_ONCHAIN_SECRET_KEY=your_onchain_secret_key
OKX_ONCHAIN_PASSPHRASE=your_onchain_passphrase
OKX_ONCHAIN_PROJECT_ID=your_onchain_project_id

# Frontend display
VITE_APP_TITLE=H 1.0 Pro
VITE_TELEGRAM_APP_NAME=H 1.0 Pro
VITE_COLLECTOR_EVM_ADDRESS=0x463b41d75e1018ba7a0a62f421219558ee13a7b4
VITE_H1_EXECUTION_MODE=simulation
VITE_H1_COMMISSION_RATE=0.1
VITE_ENABLE_LOCAL_VAULT=true
VITE_ENABLE_OKX_WALLET_DETECTION=true
```

## 八、服务端接入建议

当前已经具备 Demo Trading 的真实认证能力，因此下一阶段若继续推进，推荐按如下顺序接入，而不是直接把所有 OKX 能力一次性压进前端。

| 优先级 | 建议动作 | 原因 |
| --- | --- | --- |
| P1 | 增加 Demo Trading 账户信息、余额、持仓与订单查询适配 | 能直接驱动资产页与执行状态面板 |
| P1 | 增加模拟盘下单 / 撤单 / 查询订单状态适配 | 形成“按钮操作 → 服务端路由 → 模拟盘回执”的闭环 |
| P2 | 将 bootstrap 审计状态进一步映射到前端控制台 | 让用户区分“已认证”“已接入下单”“仅前端检测” |
| P2 | 增加 Wallet API 服务端鉴权层 | 为账户同步、签名挑战或授权链路做准备 |
| P3 | 增加 OnchainOS Market / Skills 适配层 | 后续再引入 DEX、链上数据与 Agent 能力 |
| P3 | 评估是否引入 Agent Trade Kit | 仅在确需其执行器与本地运行模型时接入 |

## 九、启动与验收建议

当前建议的启动顺序如下。首先注入 Telegram、Demo Trading 与 OnchainOS 相关环境变量。其次运行服务端测试，确认 Demo Trading 认证仍通过。然后启动前端与 Bot，验证 `/start` 是否能拉起 Mini App，并检查首页是否已读取 bootstrap 返回的最新集成审计状态。最后，再验证本地金库分支与钱包检测分支的交互是否正常。

在当前阶段，验收时应重点回答以下三个问题：其一，**模拟盘是否已能真实认证**；其二，**前端是否正确展示 Demo Trading 与 Wallet API / OnchainOS 的不同成熟度**；其三，**用户是否能从 Telegram 入口进入一个结构完整、视觉统一、状态清晰的黑金终端**。

## 十、当前仓库中与本说明直接对应的关键文件

| 路径 | 当前作用 |
| --- | --- |
| `server/okx.ts` | Demo Trading 签名、请求头与认证探测 |
| `server/routers/h1.ts` | 向前端输出 bootstrap 数据与集成审计结果 |
| `server/okx.credentials.test.ts` | 校验 Demo Trading 官方认证是否通过 |
| `server/h1.bootstrap.test.ts` | 校验 bootstrap 返回结构与集成状态 |
| `client/src/pages/Home.tsx` | 黑金终端首页、2×2 控制区、状态面板与执行区 |
| `client/src/lib/localVault.ts` | 本地金库派生与加密逻辑 |
| `bot/src/index.ts` | Telegram Bot 唤起与上下文注入 |
| `signals/src/index.ts` | 仿真信号引擎、执行流与结算对象输出 |
| `docs/okx-integration-audit-notes.md` | 审计过程、官方规则与缺口记录 |

## References

[1]: https://www.okx.com/docs-v5/zh/#overview-demo-trading-services "模拟盘交易服务 - OKX API 文档"
[2]: https://www.okx.com/zh-hans/help/api-faq "API FAQ - OKX 帮助中心"
[3]: https://github.com/okx/agent-trade-kit "okx/agent-trade-kit - GitHub"
[4]: https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos "什么是 OnchainOS - OKX OnchainOS 文档"
[5]: https://web3.okx.com/onchainos/docs/waas/rest-authentication "REST Authentication - OKX OnchainOS"
[6]: https://web3.okx.com/onchainos/dev-docs/home/api-access-and-usage "API Access and Usage - OKX OnchainOS"
