---
name: okx-dolphin-agent
description: 开发与部署集成 OKX OnchainOS 与 V5 API 的 AI 交易助手。支持 Agentic Wallet 生成、智能路由、Market AI 安全检测及一键资产归集。
---

# OKX Dolphin Agent 技能

本技能封装了开发“海豚 (Dolphin)”风格 Telegram AI 交易助手的全流程。它结合了 OKX 的中心化交易所 (CEX) 能力与去中心化 (DEX) OnchainOS 基础设施，旨在通过 AI 驱动的对话实现无缝交易。

## 核心功能与组件

### 1. 智能路由逻辑 (`scripts/dolphin_router.py`)
- **决策模型**：自动对比 CEX 与 DEX 的价格、深度、速度及滑点。
- **用户偏好**：支持 `cheap` (省钱)、`fast` (速度)、`balanced` (平衡) 三种模式。

### 2. OKX 交易所对接 (`scripts/okx_cex_service.py`)
- **V5 API 签名**：内置基于 `hmac-sha256` 的安全认证机制。
- **核心操作**：下单、余额查询、实盘/模拟盘切换。

### 3. OnchainOS & Market AI (`scripts/okx_onchain_service.py`)
- **Agentic Wallet**：支持基于 TEE 的代理钱包生成规范。
- **安全检测 (`Token_Security_Detection`)**：强制性代币风险扫描。
- **智能询价 (`DEX_Smart_Quote`)**：链上最优路径获取。
- **全 USDT 折算**：多链资产实时汇率计算。

### 4. 资产归集脚本 (`scripts/sweep_service.py`)
- **Sweep_to_USDT**：识别各链小额资产 (Dust)，在安全检测通过后自动兑换并归集。

## 开发工作流

1. **初始化环境**：
   - 准备 `TELEGRAM_BOT_TOKEN`, `OKX_API_KEY`, `OKX_API_SECRET`, `OKX_PASSPHRASE`, `OKX_PROJECT_ID`, `OKX_DEX_API_KEY`。
2. **部署后端**：
   - 使用 `templates/main_template.py` 作为入口。
   - 使用 `templates/bot_service_template.py` 定制 Telegram 交互界面（如常驻按钮）。
3. **集成安全闭环**：
   - 在任何交易前调用 `okx_onchain_service.check_token_security`。
   - 拦截风险代币并弹出红色警告。

## 最佳实践
- **私钥安全**：严禁在代码或日志中打印私钥。生产环境必须使用 OKX OnchainOS 提供的签名服务或 TEE 环境。
- **错误处理**：对 API 调用进行异常捕获，特别是在网络波动较大的链上交互环节。
- **用户确认**：在执行大额交易或资产归集前，必须通过 Telegram 按钮获取用户二次确认。
