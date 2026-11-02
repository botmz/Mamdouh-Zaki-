"""
MZ Telegram Automation — مدير قاعدة البيانات SQLite في بايثون
يتولى حفظ الإعدادات، القنوات، ومنع تكرار الرسائل بقيود فريدة (UNIQUE constraint).
"""

import sqlite3
import os
import json
import hashlib
import secrets
from datetime import datetime
from typing import Optional, Dict, Any, List

DB_PATH = os.getenv("DATABASE_PATH", "./data/mz_automation_py.db")

class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cur = conn.cursor()

            # جدول المشرفين
            cur.execute("""
            CREATE TABLE IF NOT EXISTS admin_users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
            """)

            # جدول إعدادات النظام
            cur.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """)

            # جدول قنوات المصدر
            cur.execute("""
            CREATE TABLE IF NOT EXISTS source_channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                telegram_id TEXT,
                is_active INTEGER DEFAULT 1,
                priority INTEGER DEFAULT 1,
                target_destinations TEXT, -- JSON Array
                last_message_id INTEGER,
                last_message_at TEXT,
                last_error_message TEXT,
                status TEXT DEFAULT 'connected',
                created_at TEXT NOT NULL
            )
            """)

            # جدول قنوات الواجهات (الاستقبال)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS destination_channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                telegram_id TEXT,
                is_active INTEGER DEFAULT 1,
                priority INTEGER DEFAULT 1,
                last_dispatched_at TEXT,
                last_status TEXT DEFAULT 'idle',
                current_prices_msg_id INTEGER,
                current_static_msg_id INTEGER,
                last_error_message TEXT,
                created_at TEXT NOT NULL
            )
            """)

            # جدول منع التكرار وسجل الرسائل المنقولة
            # يحتوي على قيد فريد صارم على (source_channel_id, source_message_id, destination_channel_id)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS forwarded_messages (
                id TEXT PRIMARY KEY,
                source_channel_id TEXT NOT NULL,
                source_channel_name TEXT,
                source_message_id INTEGER NOT NULL,
                destination_channel_id TEXT NOT NULL,
                destination_channel_name TEXT,
                message_type TEXT NOT NULL,
                content_preview TEXT,
                has_media INTEGER DEFAULT 0,
                links_removed_count INTEGER DEFAULT 0,
                status TEXT NOT NULL, -- 'success', 'failed', 'pending'
                error_detail TEXT,
                sent_message_id INTEGER,
                retries INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(source_channel_id, source_message_id, destination_channel_id)
            )
            """)

            # جدول سجل الأسعار
            cur.execute("""
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset TEXT NOT NULL, -- 'XAU', 'BTC'
                price REAL NOT NULL,
                previous_price REAL,
                direction TEXT NOT NULL, -- 'up', 'down', 'neutral'
                change_percent REAL,
                source TEXT,
                unit TEXT,
                timestamp TEXT NOT NULL
            )
            """)

            # جدول سجل الأحداث والتدقيق
            cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL,
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                timestamp TEXT NOT NULL
            )
            """)

            conn.commit()
            self._ensure_default_admin(cur, conn)

    def _ensure_default_admin(self, cur, conn):
        cur.execute("SELECT id FROM admin_users WHERE username = 'admin'")
        if not cur.fetchone():
            salt = secrets.token_hex(16)
            pwd_hash = hashlib.pbkdf2_hmac('sha256', b'admin1234', salt.encode('utf-8'), 100000).hex()
            cur.execute(
                "INSERT INTO admin_users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
                (secrets.token_hex(8), 'admin', pwd_hash, salt, datetime.utcnow().isoformat())
            )
            conn.commit()

    # --- منع التكرار ---
    def is_message_already_forwarded(self, source_channel_id: str, source_message_id: int, destination_channel_id: str) -> bool:
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id FROM forwarded_messages
                WHERE source_channel_id = ? AND source_message_id = ? AND destination_channel_id = ? AND status = 'success'
            """, (source_channel_id, source_message_id, destination_channel_id))
            return cur.fetchone() is not None

    def record_forward_attempt(self, record: Dict[str, Any]) -> bool:
        with self.get_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute("""
                    INSERT INTO forwarded_messages (
                        id, source_channel_id, source_channel_name, source_message_id,
                        destination_channel_id, destination_channel_name, message_type,
                        content_preview, has_media, links_removed_count, status,
                        error_detail, sent_message_id, retries, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(source_channel_id, source_message_id, destination_channel_id)
                    DO UPDATE SET
                        status = excluded.status,
                        error_detail = excluded.error_detail,
                        sent_message_id = excluded.sent_message_id,
                        retries = forwarded_messages.retries + 1
                """, (
                    record.get('id', secrets.token_hex(8)),
                    record['source_channel_id'],
                    record.get('source_channel_name', ''),
                    record['source_message_id'],
                    record['destination_channel_id'],
                    record.get('destination_channel_name', ''),
                    record.get('message_type', 'text'),
                    record.get('content_preview', '')[:200],
                    1 if record.get('has_media') else 0,
                    record.get('links_removed_count', 0),
                    record.get('status', 'pending'),
                    record.get('error_detail'),
                    record.get('sent_message_id'),
                    record.get('retries', 0),
                    datetime.utcnow().isoformat()
                ))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                return False

    def add_audit_log(self, level: str, category: str, message: str, details: Optional[str] = None):
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO audit_logs (level, category, message, details, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (level, category, message, details, datetime.utcnow().isoformat()))
            conn.commit()

    def save_price(self, asset: str, price: float, source: str, unit: str) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT price FROM price_history WHERE asset = ? ORDER BY id DESC LIMIT 1", (asset,))
            prev_row = cur.fetchone()
            prev_price = prev_row[0] if prev_row else price

            direction = "neutral"
            if price > prev_price:
                direction = "up"
            elif price < prev_price:
                direction = "down"

            change_pct = round(((price - prev_price) / prev_price) * 100, 2) if prev_price > 0 else 0.0

            cur.execute("""
                INSERT INTO price_history (asset, price, previous_price, direction, change_percent, source, unit, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (asset, price, prev_price, direction, change_pct, source, unit, datetime.utcnow().isoformat()))
            conn.commit()

            return {
                "asset": asset,
                "price": price,
                "previous_price": prev_price,
                "direction": direction,
                "change_percent": change_pct,
                "source": source,
                "unit": unit
            }
