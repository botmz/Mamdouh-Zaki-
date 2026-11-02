import unittest
from python_backend.prices import format_prices_message

class TestPricesFormatting(unittest.TestCase):
    def test_arrow_indicators(self):
        gold_up = {"price": 3899.50, "direction": "up"}
        btc_down = {"price": 78200.0, "direction": "down"}

        msg = format_prices_message(gold_up, btc_down)
        self.assertIn("🟢 ▲", msg)
        self.assertIn("🔴 ▼", msg)
        self.assertIn("3,899.50$", msg)
        self.assertIn("78,200$", msg)

    def test_neutral_arrow(self):
        gold_flat = {"price": 3500.0, "direction": "neutral"}
        btc_flat = {"price": 80000.0, "direction": "neutral"}

        msg = format_prices_message(gold_flat, btc_flat)
        self.assertIn("⚪ ▬", msg)

if __name__ == '__main__':
    unittest.main()
