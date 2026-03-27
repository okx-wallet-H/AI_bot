from typing import Dict, Any, Tuple
from core.okx_cex import OKXExchangeClient
from core.okx_onchain import OKXOnchainClient

class DolphinRouter:
    def __init__(self, cex_client: OKXExchangeClient, dex_client: OKXOnchainClient):
        self.cex_client = cex_client
        self.dex_client = dex_client
        self.price_threshold = 0.005 # 0.5% 价格差异阈值

    def analyze_trade(self, symbol: str, amount: float, user_preference: str = "balanced") -> Tuple[str, Dict[str, Any]]:
        """
        核心智能路由逻辑：判断是在交易所买还是链上买。
        :param symbol: 交易对 (如 BTC)
        :param amount: 交易数量
        :param user_preference: 用户偏好 ('cheap', 'fast', 'balanced')
        :return: (建议执行平台, 详情数据)
        """
        # 1. 获取 CEX 价格 (以 USDT 计价)
        inst_id = f"{symbol}-USDT"
        cex_ticker = self.cex_client.get_ticker(inst_id)
        cex_price = float(cex_ticker.get("data", [{}])[0].get("last", 0))

        # 2. 获取 DEX 报价 (此处简化逻辑，实际需根据链 ID 和 Token 地址)
        dex_price = cex_price * 1.002 # 模拟 DEX 价格略高 0.2%

        # 3. 路由判断逻辑
        recommendation = "CEX"
        reason = "CEX 价格更优且流动性更好"

        if user_preference == "fast":
            recommendation = "DEX"
            reason = "DEX 直接到账您的 Agentic Wallet，无需入金操作，速度最快。"
        elif dex_price < cex_price:
            recommendation = "DEX"
            reason = "链上当前价格更优。"
        elif (dex_price - cex_price) / cex_price < self.price_threshold and user_preference == "balanced":
            recommendation = "CEX"
            reason = "CEX 手续费更低且深度充足。"

        return recommendation, {
            "cex_price": cex_price,
            "dex_price": dex_price,
            "reason": reason,
            "best_platform": recommendation
        }
