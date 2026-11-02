"""
MZ Telegram Automation — محرك الأسعار المباشرة في بايثون
يجلب أسعار الذهب والبيتكوين مع مصادر متعددة وحساب اتجاه السعر (🟢 ▲ / 🔴 ▼).
"""

import urllib.request
import json
import logging
from typing import Dict, Any, Tuple
from datetime import datetime

logger = logging.getLogger("prices")

def fetch_bitcoin_price() -> Tuple[float, str]:
    """يجلب سعر البيتكوين المباشر من Binance أو CoinGecko"""
    # 1. Binance Ticker
    try:
        req = urllib.request.Request(
            "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
            headers={"User-Agent": "MZ-Telegram-Automation/1.0"}
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode())
            price = float(data["price"])
            if price > 1000:
                return round(price, 2), "Binance Live (BTC/USDT)"
    except Exception as e:
        logger.warning(f"Binance fetch error: {e}")

    # 2. CoinGecko Fallback
    try:
        req = urllib.request.Request(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
            headers={"User-Agent": "MZ-Telegram-Automation/1.0"}
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode())
            price = float(data["bitcoin"]["usd"])
            if price > 1000:
                return round(price, 2), "CoinGecko Live (BTC/USD)"
    except Exception as e:
        logger.warning(f"CoinGecko fetch error: {e}")

    return 78000.0, "سعر مرجعي أولي (تعذر الاتصال)"

def fetch_gold_price() -> Tuple[float, str]:
    """يجلب سعر الذهب الفوري للأونصة XAU/USD من Yahoo Finance GC=F"""
    try:
        req = urllib.request.Request(
            "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode())
            meta = data["chart"]["result"][0]["meta"]
            price = meta.get("regularMarketPrice") or meta.get("chartPreviousClose")
            if price and float(price) > 500:
                return round(float(price), 2), "Yahoo Finance (Gold Spot XAU/USD)"
    except Exception as e:
        logger.warning(f"Gold fetch error: {e}")

    return 3890.50, "سعر مرجعي أولي (تعذر الاتصال)"

def format_prices_message(gold_data: Dict[str, Any], btc_data: Dict[str, Any], template: str = None) -> str:
    """ينسق رسالة الأسعار وفق القالب المخصص ورموز الأسهم الملونة"""
    arrow_map = {
        "up": "🟢 ▲",
        "down": "🔴 ▼",
        "neutral": "⚪ ▬"
    }

    gold_arrow = arrow_map.get(gold_data.get("direction", "neutral"), "⚪ ▬")
    btc_arrow = arrow_map.get(btc_data.get("direction", "neutral"), "⚪ ▬")

    gold_val = f"{gold_data.get('price', 0):,.2f}"
    btc_val = f"{int(btc_data.get('price', 0)):,}"

    now_str = datetime.now().strftime("%Y/%m/%d - %H:%M:%S")

    if not template:
        template = (
            "⚡ الذهب XAU/USD: {gold_price}$ | {gold_arrow}\n"
            "₿ البيتكوين BTC/USD: {btc_price}$ | {btc_arrow}\n"
            "آخر تحديث: {updated_at}"
        )

    msg = template.replace("{gold_price}", gold_val)\
                  .replace("{gold_arrow}", gold_arrow)\
                  .replace("{btc_price}", btc_val)\
                  .replace("{btc_arrow}", btc_arrow)\
                  .replace("{updated_at}", now_str)

    return msg
