import os
import asyncio
import uvicorn
from fastapi import FastAPI
from dotenv import load_dotenv
from app.services.okx_cex_service import OKXExchangeClient
from app.services.okx_onchain_service import OKXOnchainClient
from app.services.telegram_bot_service import DolphinTelegramBot

# 加载环境变量
load_dotenv()

# 初始化 FastAPI
app = FastAPI(title="海豚 (Dolphin) 交易助手 API")

# 获取配置
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
OKX_API_KEY = os.getenv("OKX_API_KEY")
OKX_API_SECRET = os.getenv("OKX_API_SECRET")
OKX_PASSPHRASE = os.getenv("OKX_PASSPHRASE")
OKX_IS_SIMULATE = os.getenv("OKX_IS_SIMULATE", "True").lower() == "true"
OKX_DEX_API_KEY = os.getenv("OKX_DEX_API_KEY")
OKX_PROJECT_ID = os.getenv("OKX_PROJECT_ID")

# 初始化 OKX 客户端
cex_client = OKXExchangeClient(OKX_API_KEY, OKX_API_SECRET, OKX_PASSPHRASE, OKX_IS_SIMULATE)
dex_client = OKXOnchainClient(OKX_DEX_API_KEY, OKX_PROJECT_ID)

# 初始化 Telegram Bot
bot = DolphinTelegramBot(TELEGRAM_TOKEN, cex_client, dex_client)

@app.get("/")
async def root():
    return {"message": "海豚 (Dolphin) 交易助手后端正在运行。"}

@app.on_event("startup")
async def startup_event():
    # 异步初始化并启动 Bot
    await bot.app.initialize()
    await bot.app.start()
    await bot.app.updater.start_polling()
    print("Telegram Bot started polling...")

@app.on_event("shutdown")
async def shutdown_event():
    await bot.app.updater.stop()
    await bot.app.stop()
    await bot.app.shutdown()
    print("Telegram Bot stopped.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
