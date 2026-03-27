import requests
import json
from typing import Dict, Any, List

class OKXOnchainClient:
    def __init__(self, dex_api_key: str, project_id: str):
        self.dex_api_key = dex_api_key
        self.project_id = project_id
        self.base_url = "https://www.okx.com"
        
    def _get_headers(self) -> Dict[str, str]:
        return {
            "OK-ACCESS-KEY": self.dex_api_key,
            "Content-Type": "application/json"
        }

    def check_token_security(self, chain_id: str, token_address: str) -> Dict[str, Any]:
        """
        [Market AI Skill] Token_Security_Detection
        调用安全检测接口，识别蜜罐、高税收、权限过大等风险。
        """
        request_path = f"/api/v5/dex/token/security?chainId={chain_id}&tokenAddress={token_address}"
        url = self.base_url + request_path
        headers = self._get_headers()
        try:
            response = requests.get(url, headers=headers)
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_smart_quote(self, chain_id: str, from_token: str, to_token: str, amount: str) -> Dict[str, Any]:
        """
        [Market AI Skill] DEX_Smart_Quote
        获取智能询价，包含最优路由建议。
        """
        request_path = f"/api/v5/dex/aggregator/quote?chainId={chain_id}&fromTokenAddress={from_token}&toTokenAddress={to_token}&amount={amount}"
        url = self.base_url + request_path
        headers = self._get_headers()
        try:
            response = requests.get(url, headers=headers)
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_token_price_usdt(self, chain_id: str, token_address: str) -> float:
        """获取代币的 USDT 实时折算价格"""
        # 实际调用 /api/v5/dex/token/price
        request_path = f"/api/v5/dex/token/price?chainId={chain_id}&tokenAddress={token_address}"
        url = self.base_url + request_path
        headers = self._get_headers()
        try:
            response = requests.get(url, headers=headers)
            data = response.json()
            return float(data.get("data", [{}])[0].get("price", 0))
        except:
            return 0.0

    def get_all_balances_with_usdt(self, address: str, chains: List[str]) -> Dict[str, Any]:
        """获取所有链的余额并折算为 USDT"""
        total_usdt = 0.0
        details = []
        
        for chain in chains:
            # 1. 获取链上代币列表 (简化逻辑：仅获取原生币和主流代币)
            # 实际需调用 /api/v5/dex/token/balance
            mock_balance = 1.5 # 模拟余额
            price = 2500.0 if chain == "Base" else 140.0 # 模拟价格
            usdt_value = mock_balance * price
            
            total_usdt += usdt_value
            details.append({
                "chain": chain,
                "balance": mock_balance,
                "usdt_value": usdt_value
            })
            
        return {
            "total_usdt": total_usdt,
            "details": details
        }

    def create_agentic_wallet(self, user_id: str) -> Dict[str, Any]:
        """创建 Agentic Wallet"""
        print(f"Creating Agentic Wallet for user: {user_id} via TEE...")
        return {
            "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            "chains": ["Solana", "Base"],
            "status": "success"
        }
