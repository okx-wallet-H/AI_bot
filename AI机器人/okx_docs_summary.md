# OKX 开发者文档核心要点总结

## 1. OKX OnchainOS (Agentic Wallet)
- **核心理念**：AI 原生钱包，私钥生成、存储、签名均在 **TEE (可信执行环境)** 内完成。
- **对接方式**：
  - **Skills**: 对话驱动。
  - **Open API**: 程序精准调用。
- **能力**：
  - 支持多链（EVM, Solana）。
  - OKX DEX 聚合引擎驱动，智能路由。
  - 支持 x402 协议（自主支付）。
  - 最多支持 50 个子钱包。

## 2. OKX 交易所 V5 API
- **认证方式**：API Key, Secret Key, Passphrase。
- **REST 接口**：
  - 下单：`POST /api/v5/trade/order`
  - 余额查询：`GET /api/v5/account/balance`
  - 行情：`GET /api/v5/market/ticker`
- **特点**：支持实盘与模拟盘，提供 WebSocket 支持。

## 3. 智能路由逻辑 (Dolphin 核心)
- **交易所买 (便宜)**：利用 CEX 的深度和低手续费。
- **链上买 (快)**：利用 DEX 的去中心化、无需入金流程、直接到账钱包。
- **AI 判断标准**：
  - 价格差异（CEX vs DEX）。
  - 交易规模（滑点）。
  - 用户紧迫性（快 vs 省）。
