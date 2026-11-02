import unittest
from python_backend.cleaner import clean_message_text, clean_media_caption

class TestCleaner(unittest.TestCase):
    def test_plain_urls_removed(self):
        text = "عاجل: أعلن البنك الفيدرالي قراره اليوم https://example.com/news وترقبوا التفاصيل"
        res = clean_message_text(text, remove_plain_urls=True)
        self.assertNotIn("https://example.com/news", res["cleaned_text"])
        self.assertIn("عاجل: أعلن البنك الفيدرالي قراره اليوم", res["cleaned_text"])
        self.assertIn("وترقبوا التفاصيل", res["cleaned_text"])
        self.assertEqual(res["links_removed_count"], 1)

    def test_message_not_deleted_when_containing_link(self):
        text = "هذا نص تجريبي يحتوي على رابط www.google.com للتجربة فقط"
        res = clean_message_text(text, remove_plain_urls=True)
        self.assertTrue(len(res["cleaned_text"]) > 10)
        self.assertIn("هذا نص تجريبي يحتوي على رابط", res["cleaned_text"])

    def test_telegram_short_link_removal(self):
        text = "تابعونا على قناتنا t.me/mychannel أو t.me/+joinchat123 لمزيد من التفاصيل"
        res = clean_message_text(text, remove_telegram_links=True)
        self.assertNotIn("t.me/mychannel", res["cleaned_text"])
        self.assertNotIn("joinchat123", res["cleaned_text"])
        self.assertIn("تابعونا على قناتنا", res["cleaned_text"])

    def test_markdown_hyperlink_keep_text(self):
        text = "انقر هنا لقراءة [التقرير الاقتصادي الشامل](https://finance.example.com/doc) بالتفصيل"
        res = clean_message_text(text, clean_hyperlinks_mode='keep_text')
        self.assertIn("التقرير الاقتصادي الشامل", res["cleaned_text"])
        self.assertNotIn("https://finance.example.com/doc", res["cleaned_text"])

    def test_caption_cleaning_preserves_description(self):
        caption = "مخطط بياني يوضح حركة الذهب للأسبوع الحالي https://charts.org/gold"
        res = clean_media_caption(caption, remove_urls_captions=True)
        self.assertIn("مخطط بياني يوضح حركة الذهب للأسبوع الحالي", res["cleaned_text"])
        self.assertNotIn("https://charts.org/gold", res["cleaned_text"])

if __name__ == '__main__':
    unittest.main()
