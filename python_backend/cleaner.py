"""
MZ Telegram Automation — وحدة تصفية الروابط في بايثون
تقوم بحذف الروابط فقط دون المساس بالنص أو حذف المرفقات والوسائط.
"""

import re
from typing import Dict, Any, List

PLAIN_URL_PATTERN = re.compile(
    r'\b(?:https?://|ftp://|www\.)[^\s<>"\'()[\]{}|\\^`]+(?:\([^\s<>"\'()[\]{}|\\^`]*\)|[^\s`!()[\]{};:\'".,<>?«»“”‘’])',
    re.IGNORECASE
)
TELEGRAM_LINK_PATTERN = re.compile(
    r'\b(?:t\.me|telegram\.me)/(?:joinchat/|\+)?[a-zA-Z0-9_+/=-]+',
    re.IGNORECASE
)
MARKDOWN_LINK_PATTERN = re.compile(
    r'\[([^\]]+)\]\((https?://[^\s\)]+|t\.me/[^\s\)]+)\)',
    re.IGNORECASE
)
HTML_LINK_PATTERN = re.compile(
    r'<a\s+(?:[^>]*?\s+)?href=["\']([^"\']*)["\'][^>]*>(.*?)</a>',
    re.IGNORECASE
)

def clean_message_text(
    text: str,
    remove_plain_urls: bool = True,
    clean_hyperlinks_mode: str = 'keep_text', # 'keep_text', 'strip_all', 'preserve'
    remove_telegram_links: bool = True
) -> Dict[str, Any]:
    if not text:
        return {"cleaned_text": "", "original_text": "", "links_removed_count": 0, "removed_urls": []}

    cleaned = text
    removed_urls: List[str] = []
    count = 0

    # 1. روابط Markdown و HTML المنسقة
    if clean_hyperlinks_mode == 'keep_text':
        def replace_md(m):
            nonlocal count
            count += 1
            removed_urls.append(m.group(2))
            return m.group(1) # Keep anchor text

        def replace_html(m):
            nonlocal count
            count += 1
            removed_urls.append(m.group(1))
            return m.group(2) # Keep anchor text

        cleaned = MARKDOWN_LINK_PATTERN.sub(replace_md, cleaned)
        cleaned = HTML_LINK_PATTERN.sub(replace_html, cleaned)

    elif clean_hyperlinks_mode == 'strip_all':
        def strip_md(m):
            nonlocal count
            count += 1
            removed_urls.append(m.group(2))
            return ""

        def strip_html(m):
            nonlocal count
            count += 1
            removed_urls.append(m.group(1))
            return ""

        cleaned = MARKDOWN_LINK_PATTERN.sub(strip_md, cleaned)
        cleaned = HTML_LINK_PATTERN.sub(strip_html, cleaned)

    # 2. روابط تيليجرام t.me
    if remove_telegram_links:
        def replace_tg(m):
            nonlocal count
            count += 1
            removed_urls.append(m.group(0))
            return ""
        cleaned = TELEGRAM_LINK_PATTERN.sub(replace_tg, cleaned)

    # 3. الروابط الصريحة العادية http/https
    if remove_plain_urls:
        def replace_plain(m):
            nonlocal count
            count += 1
            removed_urls.append(m.group(0))
            return ""
        cleaned = PLAIN_URL_PATTERN.sub(replace_plain, cleaned)

    # تنظيف الفراغات والأسطر الفارغة المتعددة
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in cleaned.splitlines()]
    filtered_lines = []
    for i, line in enumerate(lines):
        if line == "" and i > 0 and lines[i-1] == "":
            continue
        filtered_lines.append(line)

    final_text = "\n".join(filtered_lines).strip()

    return {
        "cleaned_text": final_text,
        "original_text": text,
        "links_removed_count": count,
        "removed_urls": removed_urls
    }

def clean_media_caption(caption: str, remove_urls_captions: bool = True, clean_hyperlinks_mode: str = 'keep_text') -> Dict[str, Any]:
    if not caption:
        return {"cleaned_text": "", "original_text": "", "links_removed_count": 0, "removed_urls": []}
    return clean_message_text(caption, remove_plain_urls=remove_urls_captions, clean_hyperlinks_mode=clean_hyperlinks_mode)
