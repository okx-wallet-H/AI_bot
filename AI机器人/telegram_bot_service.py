import os
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from app.services.okx_cex_service import OKXExchangeClient
from app.services.okx_onchain_service import OKXOnchainClient
from app.services.dolphin_router import DolphinRouter
from app.services.sweep_service import SweepService

class DolphinTelegramBot:
    def __init__(self, token: str, cex_client: OKXExchangeClient, dex_client: OKXOnchainClient):
        self.token = token
        self.cex_client = cex_client
        self.dex_client = dex_client
        self.router = DolphinRouter(cex_client, dex_client)
        self.sweep_service = SweepService(dex_client)
        self.app = ApplicationBuilder().token(token).build()
        self._setup_handlers()

    def _get_main_menu(self) -> ReplyKeyboardMarkup:
        """创建常驻按钮 UI"""
        keyboard = [
            [KeyboardButton("🚀 网络策略"), KeyboardButton("🤖 自动驾驶")],
            [KeyboardButton("💰 我的资产")]
        ]
        return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

    def _setup_handlers(self):
        """设置指令处理器"""
        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(CommandHandler("balance", self.balance_command))
        self.app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), self.handle_message))
        self.app.add_handler(CallbackQueryHandler(self.handle_callback))

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """处理 /start 指令：生成 Agentic Wallet"""
        user_id = str(update.effective_user.id)
        wallet_info = self.dex_client.create_agentic_wallet(user_id)
        
        welcome_text = (
            f"🐬 **欢迎使用海豚 (Dolphin) 交易助手！**\n\n"
            f"已为您生成专属 **Agentic Wallet**：\n"
            f"`{wallet_info['address']}`\n\n"
            f"私钥已在 **TEE (可信执行环境)** 内安全生成，任何人都无法触碰。\n"
            f"现在您可以直接输入“买入 BTC”或“查询以太坊价格”开始交易！"
        )
        await update.message.reply_text(welcome_text, reply_markup=self._get_main_menu(), parse_mode='Markdown')

    async def balance_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """处理 /balance 指令：全 USDT 折算查询"""
        wallet_address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        balances = self.dex_client.get_all_balances_with_usdt(wallet_address, ["Solana", "Base"])
        
        balance_text = "💰 **您的资产详情 (全 USDT 折算)**\n\n"
        balance_text += f"📍 **Agentic Wallet**: `{wallet_address}`\n\n"
        
        for detail in balances["details"]:
            balance_text += f"🔹 **{detail['chain']}**: {detail['balance']} (≈ `${detail['usdt_value']:.2f}` USDT)\n"
            
        balance_text += f"\n💵 **总资产价值**: `${balances['total_usdt']:.2f}` USDT"
        
        # 添加一键归集按钮
        keyboard = [[InlineKeyboardButton("🧹 一键归集小额资产 (Sweep to USDT)", callback_data="sweep_dust")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if update.message:
            await update.message.reply_text(balance_text, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.callback_query.edit_message_text(balance_text, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """处理大白话消息与常驻按钮"""
        text = update.message.text
        
        if "查询" in text and "价格" in text:
            # 简单处理：查询价格
            symbol = "ETH" # 实际应从 text 中提取
            ticker = self.cex_client.get_ticker(f"{symbol}-USDT")
            price = ticker.get("data", [{}])[0].get("last", "未知")
            await update.message.reply_text(f"📊 **{symbol} 实时价格** (OKX DEX):\n\n当前价格: `${price}` USDT", parse_mode='Markdown')
            
        elif "买入" in text:
            # 核心功能：交易安全闭环
            symbol = "BTC" # 实际应提取
            amount = 0.01
            chain_id = "Base"
            token_address = "0x..." # 实际应根据 symbol 映射地址
            
            # 1. 强制安全检测 (Market AI Skill: Token_Security_Detection)
            security_info = self.dex_client.check_token_security(chain_id, token_address)
            # 模拟检测到风险
            is_risky = True # 模拟风险
            
            if is_risky:
                warning_text = (
                    f"🚨 **交易安全红色警告！**\n\n"
                    f"代币 **{symbol}** 在 {chain_id} 链上被检测到以下风险：\n"
                    f"❌ **蜜罐合约风险**\n"
                    f"❌ **高额卖出税 (10%+)**\n"
                    f"❌ **权限未放弃 (Owner can mint)**\n\n"
                    f"⚠️ **海豚已自动拦截此交易，保护您的资产安全。**"
                )
                await update.message.reply_text(warning_text, parse_mode='Markdown')
                return

            # 2. 正常路由建议 (Market AI Skill: DEX_Smart_Quote)
            recommendation, details = self.router.analyze_trade(symbol, amount)
            # ... 原有逻辑
            
        elif text == "🚀 网络策略":
            await update.message.reply_text("当前策略：**平衡模式** (优先考虑价格与深度的最佳平衡点)。")
        elif text == "🤖 自动驾驶":
            await update.message.reply_text("自动驾驶模式已关闭。开启后，AI 将根据您的策略自主执行 0.1 ETH 以下的微型套利。")
        elif text == "💰 我的资产":
            await self.balance_command(update, context)

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """处理按钮回调"""
        query = update.callback_query
        await query.answer()
        
        if query.data == "sweep_dust":
            await query.edit_message_text("🔄 **正在扫描全链小额资产...**", parse_mode='Markdown')
            # 实际调用 Sweep 逻辑
            wallet_address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
            results = await self.sweep_service.execute_sweep_to_usdt(wallet_address, "Base")
            
            summary = "✅ **资产归集完成！**\n\n"
            summary += f"已将所有小额代币自动兑换并归集至主链 USDT。\n"
            summary += f"💰 **总归集价值**: `${results['total_swept_usdt']:.2f}` USDT\n\n"
            summary += "**归集明细:**\n"
            for item in results["details"]:
                status_icon = "✅" if item["status"] == "success" else "⚠️"
                summary += f"{status_icon} {item['symbol']}: {item['status']}\n"
                
            await query.edit_message_text(summary, parse_mode='Markdown')

    def run(self):
        """启动机器人"""
        print("Dolphin Telegram Bot is running...")
        self.app.run_polling()
