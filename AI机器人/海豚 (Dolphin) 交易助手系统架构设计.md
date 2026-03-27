# 海豚 (Dolphin) 交易助手系统架构设计

本方案旨在通过 **FastAPI** 后端与 **Telegram Bot** 界面，结合 **OKX OnchainOS** 和 **OKX V5 API**，为用户提供无缝的 Web3 交易体验。系统架构分为四个主要层级：接入层、业务逻辑层、智能路由层及基础设施层。

## 1. 系统组件概览

| 组件名称 | 技术选型 | 核心职责 |
| :--- | :--- | :--- |
| **接入层** | `python-telegram-bot` | 处理用户指令（/start, /balance）、询价及常驻按钮交互。 |
| **业务逻辑层** | `FastAPI` | 核心 API 路由、用户状态管理、异步任务处理及中间层封装。 |
| **智能路由层** | `LLM / Logic Engine` | **核心大脑**：根据价格、深度、速度判断是选择 CEX 还是 DEX。 |
| **基础设施层** | `OKX SDK / API` | 对接 OKX 交易所 V5 API 与 OnchainOS (Agentic Wallet)。 |

## 2. 核心模块设计

### 2.1 智能路由 (Dolphin Router)
该模块是项目的核心。当接收到交易请求（如“买入 BTC”）时，它会并发调用以下接口：
*   **CEX 询价**：通过 `GET /api/v5/market/ticker` 获取现货价格。
*   **DEX 询价**：通过 OKX DEX API 获取链上最优聚合价格。
*   **决策模型**：
    *   若价格差异 > 阈值，优先推荐价格更优者。
    *   若用户强调“快”，优先推荐 DEX。
    *   若交易量巨大，考虑 CEX 的深度以减少滑点。

### 2.2 代理钱包管理 (Agentic Wallet)
遵循 OnchainOS 规范，为每个 Telegram 用户 ID 绑定一个 Agentic Wallet。
*   **初始化**：用户发送 `/start` 时，后端调用 OnchainOS 接口生成基于 TEE 的私钥。
*   **多链支持**：默认支持 Solana 和 Base 链，通过统一接口查询多链余额。

### 2.3 UI 交互设计
Telegram 界面将包含三个常驻按钮（ReplyKeyboardMarkup）：
1.  **【 网络策略】**：显示当前路由偏好（偏向省钱或偏向速度）。
2.  **【 自动驾驶】**：开启/关闭 AI 自动执行交易（需用户预授权）。
3.  **【💰 我的资产】**：汇总显示 CEX 账户与 Agentic Wallet 的总资产。

## 3. 安全与合规性
*   **私钥安全**：严格遵循 OnchainOS 规范，私钥不在服务器内存中以明文形式存在，所有签名操作均在 TEE 环境或通过 OKX 签名服务完成。
*   **环境隔离**：支持 `OKX_IS_SIMULATE` 环境变量，方便在测试期间使用模拟盘。
