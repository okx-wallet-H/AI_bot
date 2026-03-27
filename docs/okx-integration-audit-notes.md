# OKX 集成审查记录

## 1. Agent Trade Kit 仓库初步结论

访问 `https://github.com/okx/agent-trade-kit` 后，确认该仓库当前定位为 **OKX trading MCP server / CLI toolkit**，并非前端 SDK。页面说明其包含两类独立包：

| 包名 | 作用 |
| --- | --- |
| `okx-trade-mcp` | 供 Claude、Cursor 等 MCP 客户端调用的本地 MCP 服务 |
| `okx-trade-cli` | 终端命令行操作 OKX 的本地 CLI |

仓库页展示的核心能力包括：

| 模块 | 说明 |
| --- | --- |
| `market` | 行情、K 线、订单簿、技术指标等 |
| `spot` | 现货下单、改单、撤单、历史与条件单 |
| `swap` | 永续合约交易、仓位、杠杆、条件单 |
| `futures` | 交割合约、仓位、算法单 |
| `option` | 期权交易与 Greeks |
| `account` | 余额、账单、仓位、费率、配置 |
| `earn` | 理财、链上质押、双币赢 |
| `bot` | 网格与 DCA 机器人 |

## 2. 与当前 H 1.0 Pro 项目的直接对照

当前仓库中尚未发现 `@okx_ai/okx-trade-mcp`、`@okx_ai/okx-trade-cli` 或 `agent-trade-kit` 的安装与调用痕迹。就此可先形成一条阶段性判断：

> 现阶段 H 1.0 Pro 还没有真实接入 Agent Trade Kit；当前更接近“前端黑金终端 + Bot 拉起 + 本地钱包检测/派生 + 仿真信号快照 + x402 分账结构预留”的状态，而不是已经打通 OKX 本地下单工具链。

## 3. 对后续实现的启示

Agent Trade Kit 更适合作为 **服务端 / 本地代理层** 使用，而不是直接塞进 Telegram Mini App 前端。后续若要“逻辑跑通”，应考虑：

| 方向 | 建议 |
| --- | --- |
| 交易执行 | 在服务端或本地受控执行层接入 MCP/CLI，而非前端直接持有 OKX API Key |
| 前端职责 | 继续保留状态展示、钱包授权、签名确认、执行反馈 |
| 安全边界 | 避免把 OKX API Key 暴露到 Telegram WebView |
| 模拟交易 | 单独核查 Demo Trading API，而不是把本地仿真快照误认为官方模拟交易接入 |

后续还需继续核查：OKX Demo Trading 文档、钱包 API / OKX Connect 文档、OnchainOS Skills / Market 文档，以及当前项目是否已有对应适配层。

## 4. OKX Demo Trading 文档初步线索

访问 `https://www.okx.com/docs-v5/zh/#overview-demo-trading-services` 后，当前页面已确认以下几点：

| 观察项 | 当前结论 |
| --- | --- |
| 文档体系 | Demo Trading 属于 OKX V5 API 文档中的正式能力，而不是前端演示功能 |
| 能力范围 | 与交易账户、下单、持仓、余额、杠杆等 REST / WebSocket 能力位于同一套 API 文档体系中 |
| 当前项目状态 | H 1.0 Pro 现有 `signals/src/index.ts` 仅生成本地仿真快照与结算结构，并没有出现任何 OKX REST / WebSocket 请求实现 |

基于当前已读代码，可以先形成一个阶段性判断：

> 当前项目虽然在运行时配置中保留了 `okxEnv: "demo" | "live"` 字段，但这只是运行环境标签，并不等于已经真实接入 OKX 官方 Demo Trading 服务。

下一步仍需进一步定位文档中的认证细节，特别是模拟盘是否需要额外请求头、与实盘是否共用端点、以及下单/账户查询接口在 Demo 模式下的具体调用要求。

## 5. OnchainOS 官方文档初步线索

访问 `https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos` 后，可以确认 OnchainOS 官方当前强调的接入边界如下：

| 能力项 | 官方描述要点 |
| --- | --- |
| Skills | 可通过与 Agent 对话直接驱动 Onchain OS |
| Open API | 可通过程序方式精确调用全部能力 |
| 钱包 | Agentic Wallet 强调私钥生成与签名在 TEE 内完成 |
| 交易 | 由 OKX DEX 聚合引擎驱动，面向多链交易与智能路由 |
| 行情 | 提供多链实时市场数据、价格与交易记录 |
| 支付 | 基于 x402 协议，适用于 Agent 自主支付场景 |

据此可先得到一条非常重要的对照结论：

> 当前 H 1.0 Pro 已实现的“本地金库派生 + 仿真结算 + x402 结构预留”，并不等同于 OnchainOS 官方意义上的 Agentic Wallet、交易、行情与 Skills/Open API 的真实接入。当前版本更接近对 OnchainOS 能力模型的前端映射与架构预留，而不是已经完成官方服务对接。

后续需要继续检查：是否已有真实的 Skills / Open API 适配器、是否接入 OKX DEX / 行情查询、以及钱包部分是否只是本地随机派生而非 OnchainOS Agentic Wallet。

## 6. Agent Trade Kit 仓库复核补充（2026-03-27）

本轮再次核对 `https://github.com/okx/agent-trade-kit` 后，可以进一步确认该仓库并不是给 Telegram Mini App 前端直接调用的浏览器侧 SDK，而是面向 **本地执行环境** 的工具链，主要由 `okx-trade-mcp` 与 `okx-trade-cli` 两部分构成。

从仓库页给出的说明看，官方当前主打的是把 OKX 交易能力以 MCP / CLI 的方式暴露给 AI 客户端或终端环境，覆盖 `market`、`spot`、`swap`、`futures`、`option`、`account`、`earn`、`bot` 等模块，并强调 **107 个工具、支持算法单、账户管理、理财与交易机器人**。这意味着如果 H 1.0 Pro 后续要真正对齐其能力，最合理的做法应当是把它放在服务端代理层或受控执行器中，而不是直接塞到前端页面里。

与当前项目对照后，仍然可以维持如下判断：

> H 1.0 Pro 目前尚未真实接入 Agent Trade Kit。当前代码更接近“黑金终端 UI + Telegram/Bot 拉起 + 本地仿真信号与结算模型 + OKX / OnchainOS 能力占位”的状态，而不是已经完成官方交易工具链集成。

这也意味着，后续若要把“逻辑跑通”推进到真实可执行阶段，至少还需要补上以下环节：服务端密钥管理、Agent Trade Kit 执行适配层、交易指令与前端状态之间的同步机制，以及失败回滚与风控约束。

## 7. Demo Trading 认证要求补充（2026-03-27）

本轮进一步核对 `https://www.okx.com/zh-hans/help/api-faq` 后，可以把 OKX 模拟交易最关键的环境差异明确下来。

官方 FAQ 明确写到：

> 这个是因为 API key 和当前环境不匹配导致的，实盘调用需要使用实盘 API key，且请求的 header 里面 `x-simulated-trading` 这个参数值需要为 `0`；模拟盘调用需要使用模拟盘 API key，且请求的 header 里面 `x-simulated-trading` 这个参数值需要为 `1`。

同时，FAQ 还说明模拟盘 API key 需要在 **模拟交易环境内单独创建**，而不是直接复用实盘 API key。由此可得出以下对照判断：

| 项目 | 官方要求 | 当前 H 1.0 Pro 状态 |
| --- | --- | --- |
| API key | 模拟盘与实盘需分别创建 | 当前项目尚未接入任何 OKX 私钥配置 |
| 请求头 | Demo Trading 需显式带 `x-simulated-trading: 1` | 当前项目未发起真实 OKX 请求，因此也未设置该请求头 |
| 鉴权签名 | 仍需遵循 OKX V5 REST 签名规范 | 当前项目仅保留运行环境字段，没有真实签名层 |
| 环境切换 | key 与 header 必须匹配，否则会报 `50101 APIKey does not match current environment` | 当前项目仅有本地仿真与配置占位，尚未进入真实 Demo Trading 联调 |

据此可以把当前项目对 Demo Trading 的状态定性为：

> H 1.0 Pro 目前仍然是“本地仿真执行 + Demo 环境字段预留”，并没有真正进入 OKX 官方 Demo Trading API 的认证、签名、下单与账户查询链路。

## 8. OnchainOS 能力边界补充（2026-03-27）

本轮再次核对 `https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos` 后，可以更明确地区分 OnchainOS 官方能力与当前 H 1.0 Pro 已实现内容之间的差别。

官方文档把 OnchainOS 定义为 **AI 时代的 Web3 基础设施**，并明确提供两类接入方式：一类是通过对话驱动的 `Skills`，另一类是通过程序精确调用的 `Open API`。同时，文档将其核心能力归纳为四类：**钱包、交易、行情、支付**。

其中最关键的官方边界包括：

| 能力项 | 官方描述要点 | 对当前项目的对照结论 |
| --- | --- | --- |
| Agentic Wallet | 私钥生成与签名全程在 TEE 内完成 | 当前项目仅有前端注入检测与本地地址派生，不属于官方 Agentic Wallet |
| Skills | 可通过与 Agent 对话直接驱动 OnchainOS | 当前项目尚未接入任何官方 Skills 或 MCP 封装能力 |
| Open API | 可通过程序调用全部能力 | 当前项目尚未发现真实 Open API 调用或服务端适配器 |
| 交易 | 由 OKX DEX 聚合引擎驱动，强调多链智能路由 | 当前项目尚未接入官方 DEX/Swap 路由与交易执行 |
| 行情 | 提供多链实时市场数据与交易记录 | 当前项目 K 线与收益仍为本地数据结构与仿真快照 |
| 支付 | 基于 x402 协议 | 当前项目只是预留了 x402 / 分账结构表达，并未完成官方支付接口对接 |

据此可以继续维持并强化以下判断：

> H 1.0 Pro 当前实现的是一套围绕 OKX / OnchainOS 能力模型构建的终端原型与仿真交互层，而不是已经完成官方 OnchainOS Skills、Market、Agentic Wallet 或 Open API 的真实打通。

这意味着后续如果要把该项目推进到“真实可执行”阶段，仍需要补上服务端钱包代理、官方 API 密钥与签名管理、DEX/行情查询适配层，以及 Agent 对话到官方 Skills / Open API 的统一调用通道。

## 9. 用户补充的 Demo Trading 官方要点（2026-03-27）

用户进一步补充并确认了以下模拟盘官方规则，可作为当前项目继续接入 Demo Trading 的直接依据：

| 项目 | 用户补充的官方说明 |
| --- | --- |
| REST 地址 | `https://www.okx.com` |
| WebSocket 公共频道 | `wss://wspap.okx.com:8443/ws/v5/public` |
| WebSocket 私有频道 | `wss://wspap.okx.com:8443/ws/v5/private` |
| WebSocket 业务频道 | `wss://wspap.okx.com:8443/ws/v5/business` |
| 账户体系 | 模拟盘账户与欧易主账户互通，可直接登录 |
| API Key 创建方式 | 需要在“交易 → 模拟交易 → 个人中心 → 创建模拟盘 APIKey”中单独创建 |
| 关键请求头 | 模拟盘请求必须添加 `x-simulated-trading: 1` |
| 功能边界 | 可进行 API 模拟盘交易，但部分能力如提币、充值、申购赎回等不支持 |

这组信息与此前文档核查结果一致，并进一步强化了如下结论：

> H 1.0 Pro 若要真正打通 OKX Demo Trading，必须在服务端使用模拟盘专用 API Key、以 `https://www.okx.com` 作为 REST 基址，并在请求头中显式添加 `x-simulated-trading: 1`；当前项目仍未完成这一层真实适配。

## 10. Demo Trading 真实认证进展与当前剩余缺口（2026-03-27）

本轮已使用用户提供并补全的 **模拟盘专用 API Key / Secret Key / Passphrase**，对 OKX 官方 `GET /api/v5/account/config` 接口完成轻量认证验证，请求目标仍为 `https://www.okx.com`，并显式加入请求头 `x-simulated-trading: 1`。

验证结果表明：

| 能力项 | 当前状态 | 说明 |
| --- | --- | --- |
| Demo Trading 凭证 | 已验证通过 | 服务端已可用模拟盘专用凭证通过官方账户配置接口认证 |
| Demo Trading 适配层 | 已建立基础层 | 新增了服务端签名、请求头封装与账户配置探测能力 |
| Bootstrap 审计回填 | 已完成 | `h1.bootstrap` 现在会返回真实的模拟盘联通状态，而不再只是纯占位说明 |
| Wallet API | 仍未真实接入 | 当前仍停留在前端钱包注入检测与本地金库派生层 |
| OnchainOS / Skills / Market | 仍未真实接入 | 尚未建立服务端签名适配、Project ID 鉴权与具体接口调用层 |
| agent-trade-kit | 仍未真实接入 | 当前代码库仍未发现官方 SDK 或执行适配器落地 |

当前阶段应形成的判断是：

> H 1.0 Pro 已从“仅保留 Demo 字段与本地仿真模型”推进到“**已具备 OKX Demo Trading 真实认证能力，并已能把联通状态回填给服务端 bootstrap**”；但距离真正的模拟盘下单、账户查询联动、前端交易面板驱动，以及 Wallet API / OnchainOS / agent-trade-kit 的进一步落地，仍有明确缺口需要继续补齐。
