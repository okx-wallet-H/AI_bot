# 海豚 (Dolphin) Telegram AI 交易助手

海豚 (Dolphin) 是一款面向 Web3 普通用户的 AI 交易助手。它集成了 **OKX OnchainOS** 和 **OKX 交易所 V5 API**，旨在通过大白话对话，让交易变得简单、智能、安全。

## 🌟 核心功能

- **/start**: 自动为用户生成基于 **TEE (可信执行环境)** 的 Agentic Wallet。
- **/balance**: 一键查询 Solana 和 Base 链的资产余额。
- **大白话询价**: 输入“查询以太坊价格”，实时获取 OKX DEX 的聚合报价。
- **智能路由**: 当用户输入“买入 BTC”时，AI 自动对比 CEX 与 DEX 的价格、深度及速度，给出最佳建议。
- **UI 交互**: 提供【 网络策略】、【 自动驾驶】、【💰 我的资产】常驻按钮。

## 🛠️ 技术栈

- **后端**: FastAPI (Python)
- **Bot 框架**: python-telegram-bot
- **交易对接**: OKX V5 API & OKX OnchainOS (DEX Aggregator)
- **安全**: 遵循 OnchainOS TEE 私钥生成规范

## 🚀 快速开始

### 1. 准备环境变量
复制 `.env.example` 并重命名为 `.env`，填入以下信息：
```env
TELEGRAM_BOT_TOKEN=你的机器人Token
OKX_API_KEY=交易所APIKey
OKX_API_SECRET=交易所Secret
OKX_PASSPHRASE=交易所Passphrase
OKX_IS_SIMULATE=True
OKX_DEX_API_KEY=DEX_API_KEY
OKX_PROJECT_ID=OnchainOS_Project_ID
```

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 启动后端
```bash
python main.py
```

## 🔒 安全说明
本项目遵循 OKX OnchainOS 的安全规范：
- 私钥在可信执行环境 (TEE) 中生成，服务器不存储私钥明文。
- 所有交易需通过 AI 意图解析后，由用户或预授权策略触发签名。
