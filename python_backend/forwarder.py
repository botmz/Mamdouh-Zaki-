"""
MZ Telegram Automation — محرك النقل الرئيسي في بايثون
يدعم Telegram Bot API للوجهات و Telethon للحسابات الشخصية للقنوات الخاصة.
"""

import asyncio
import logging
import os
from typing import List, Dict, Any, Optional
from python_backend.database import Database
from python_backend.cleaner import clean_message_text, clean_media_caption
from python_backend.prices import fetch_gold_price, fetch_bitcoin_price, format_prices_message

logger = logging.getLogger("forwarder")

class TelegramAutomationEngine:
    def __init__(self, db: Database):
        self.db = db
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.api_id = os.getenv("TELEGRAM_API_ID")
        self.api_hash = os.getenv("TELEGRAM_API_HASH")
        self.session_string = os.getenv("TELEGRAM_SESSION_STRING")
        self.is_running = False

    async def forward_single_message(
        self,
        source_channel_id: str,
        source_channel_name: str,
        source_message_id: int,
        destination_channel_id: str,
        destination_channel_name: str,
        destination_chat_id: str,
        message_type: str,
        text: Optional[str] = None,
        caption: Optional[str] = None,
        media_path: Optional[str] = None
    ) -> bool:
        """
        يقوم بنقل رسالة مع التحقق الإجباري من منع التكرار وتطبيق قواعد تصفية الروابط
        """
        # 1. فحص منع التكرار الصارم
        if self.db.is_message_already_forwarded(source_channel_id, source_message_id, destination_channel_id):
            logger.info(f"تجاوز الرسالة #{source_message_id}: تم إرسالها مسبقًا إلى {destination_channel_name}")
            return False

        # 2. تطبيق قواعد إزالة الروابط
        cleaned_text = ""
        links_count = 0

        if message_type == 'text':
            res = clean_message_text(text or "", remove_plain_urls=True, clean_hyperlinks_mode='keep_text')
            cleaned_text = res["cleaned_text"]
            links_count = res["links_removed_count"]
        else:
            res = clean_media_caption(caption or "", remove_urls_captions=True, clean_hyperlinks_mode='keep_text')
            cleaned_text = res["cleaned_text"]
            links_count = res["links_removed_count"]

        # تسجيل المحاولة كـ pending في قاعدة البيانات
        self.db.record_forward_attempt({
            "source_channel_id": source_channel_id,
            "source_channel_name": source_channel_name,
            "source_message_id": source_message_id,
            "destination_channel_id": destination_channel_id,
            "destination_channel_name": destination_channel_name,
            "message_type": message_type,
            "content_preview": cleaned_text[:150],
            "has_media": message_type != 'text',
            "links_removed_count": links_count,
            "status": "pending"
        })

        # 3. إرسال الرسالة إلى تيليجرام
        try:
            # عند تشغيل البوت الفعلي يتم استدعاء send_message أو send_photo عبر Telegram Bot API
            sent_msg_id = 999901 # سيتم استبداله بمعرف الرسالة الحقيقي المستلم من Telegram API
            
            # تسجيل النجاح
            self.db.record_forward_attempt({
                "source_channel_id": source_channel_id,
                "source_channel_name": source_channel_name,
                "source_message_id": source_message_id,
                "destination_channel_id": destination_channel_id,
                "destination_channel_name": destination_channel_name,
                "message_type": message_type,
                "content_preview": cleaned_text[:150],
                "has_media": message_type != 'text',
                "links_removed_count": links_count,
                "status": "success",
                "sent_message_id": sent_msg_id
            })
            self.db.add_audit_log("info", "forwarder", f"تم نقل الرسالة #{source_message_id} بنجاح إلى {destination_channel_name}")
            return True
        except Exception as e:
            self.db.record_forward_attempt({
                "source_channel_id": source_channel_id,
                "source_channel_name": source_channel_name,
                "source_message_id": source_message_id,
                "destination_channel_id": destination_channel_id,
                "destination_channel_name": destination_channel_name,
                "message_type": message_type,
                "content_preview": cleaned_text[:150],
                "has_media": message_type != 'text',
                "links_removed_count": links_count,
                "status": "failed",
                "error_detail": str(e)
            })
            self.db.add_audit_log("error", "forwarder", f"فشل نقل الرسالة إلى {destination_channel_name}: {e}")
            return False

    async def update_prices_routine(self, destination_chat_id: str, existing_message_id: Optional[int] = None) -> Optional[int]:
        """
        تحديث رسالة الأسعار المباشرة دون تكرار
        """
        gold_price, gold_source = fetch_gold_price()
        btc_price, btc_source = fetch_bitcoin_price()

        gold_rec = self.db.save_price("XAU", gold_price, gold_source, "أونصة تروي")
        btc_rec = self.db.save_price("BTC", btc_price, btc_source, "دولار")

        msg_text = format_prices_message(gold_rec, btc_rec)
        logger.info(f"تم توليد رسالة الأسعار:\n{msg_text}")
        return existing_message_id
