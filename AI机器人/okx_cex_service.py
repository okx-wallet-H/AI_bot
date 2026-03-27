import hmac
import base64
import time
import datetime
import requests
import json
from typing import Dict, Any

class OKXExchangeClient:
    def __init__(self, api_key: str, secret_key: str, passphrase: str, is_simulate: bool = False):
        self.api_key = api_key
        self.secret_key = secret_key
        self.passphrase = passphrase
        self.is_simulate = is_simulate
        self.base_url = "https://www.okx.com"
        
    def _get_timestamp(self) -> str:
        return datetime.datetime.utcnow().isoformat()[:-3] + 'Z'

    def _generate_signature(self, timestamp: str, method: str, request_path: str, body: str = "") -> str:
        if not body:
            body = ""
        message = timestamp + method.upper() + request_path + body
        mac = hmac.new(bytes(self.secret_key, encoding='utf8'), bytes(message, encoding='utf8'), digestmod='sha256')
        return base64.b64encode(mac.digest()).decode('utf-8')

    def _get_headers(self, method: str, request_path: str, body: str = "") -> Dict[str, str]:
        timestamp = self._get_timestamp()
        signature = self._generate_signature(timestamp, method, request_path, body)
        headers = {
            'Content-Type': 'application/json',
            'OK-ACCESS-KEY': self.api_key,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': self.passphrase,
            'x-simulated-trading': '1' if self.is_simulate else '0'
        }
        return headers

    def get_ticker(self, inst_id: str) -> Dict[str, Any]:
        """获取行情"""
        request_path = f"/api/v5/market/ticker?instId={inst_id}"
        url = self.base_url + request_path
        response = requests.get(url)
        return response.json()

    def get_balance(self) -> Dict[str, Any]:
        """获取账户余额"""
        request_path = "/api/v5/account/balance"
        url = self.base_url + request_path
        headers = self._get_headers("GET", request_path)
        response = requests.get(url, headers=headers)
        return response.json()

    def place_order(self, inst_id: str, side: str, ord_type: str, sz: str, px: str = None) -> Dict[str, Any]:
        """下单"""
        request_path = "/api/v5/trade/order"
        url = self.base_url + request_path
        body = {
            "instId": inst_id,
            "tdMode": "cash",
            "side": side,
            "ordType": ord_type,
            "sz": sz
        }
        if px:
            body["px"] = px
        
        json_body = json.dumps(body)
        headers = self._get_headers("POST", request_path, json_body)
        response = requests.post(url, headers=headers, data=json_body)
        return response.json()
