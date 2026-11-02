"""
MZ Telegram Automation — مشغل الخدمة المستمرة في بايثون
يقوم بتشغيل المجدول الدوري لتحديث الأسعار ومراقبة القنوات في الخلفية 24/7.
"""

import asyncio
import logging
import signal
import sys
from python_backend.database import Database
from python_backend.forwarder import TelegramAutomationEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] (%(name)s) %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("main")

async def run_worker():
    db = Database()
    engine = TelegramAutomationEngine(db)
    logger.info("⚡ تم تشغيل محرك MZ Telegram Automation بنجاح...")
    db.add_audit_log("info", "system", "تم بدء تشغيل خدمة بايثون الخلفية بنجاح 24/7")

    # حلقة العمل الدورية
    while True:
        try:
            # 1. تحديث الأسعار المباشرة دورياً
            await engine.update_prices_routine(destination_chat_id="@sample_channel")
        except Exception as e:
            logger.error(f"خطأ أثناء دورة التحديث: {e}")

        # انتظار 5 دقائق (300 ثانية) قبل الدورة التالية
        await asyncio.sleep(300)

if __name__ == '__main__':
    try:
        asyncio.run(run_worker())
    except (KeyboardInterrupt, SystemExit):
        logger.info("تم إيقاف الخدمة بطلب من النظام.")
