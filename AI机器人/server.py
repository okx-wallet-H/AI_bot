import os
import uvicorn
from fastapi import FastAPI
from dotenv import load_dotenv
from core.okx_cex import OKXExchangeClient
from core.okx_onchain import OKXOnchainClient
from bot.bot_service import DolphinTelegramBot

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

# 初始化 Telegram Bot (按需启动)
# bot = DolphinTelegramBot(TELEGRAM_TOKEN, cex_client, dex_client)

@app.get("/")
async def root():
    return {"message": "海豚 (Dolphin) 交易助手后端正在运行。"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
