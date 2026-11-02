import unittest
import os
import shutil
import tempfile
from python_backend.database import Database

class TestDeduplication(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_mz.db")
        self.db = Database(self.db_path)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_prevent_duplicate_forwarding(self):
        # 1. Message not forwarded initially
        self.assertFalse(self.db.is_message_already_forwarded("src_1", 1001, "dest_1"))

        # 2. Record successful attempt
        success = self.db.record_forward_attempt({
            "source_channel_id": "src_1",
            "source_message_id": 1001,
            "destination_channel_id": "dest_1",
            "status": "success",
            "sent_message_id": 555
        })
        self.assertTrue(success)

        # 3. Message should now be recognized as already forwarded
        self.assertTrue(self.db.is_message_already_forwarded("src_1", 1001, "dest_1"))

        # 4. Same message to a different destination is NOT considered duplicate
        self.assertFalse(self.db.is_message_already_forwarded("src_1", 1001, "dest_2"))

        # 5. Different message ID from same source is NOT duplicate
        self.assertFalse(self.db.is_message_already_forwarded("src_1", 1002, "dest_1"))

    def test_retry_failed_message_updates_record(self):
        # First record as failed
        self.db.record_forward_attempt({
            "source_channel_id": "src_2",
            "source_message_id": 2001,
            "destination_channel_id": "dest_1",
            "status": "failed",
            "error_detail": "Network timeout"
        })
        self.assertFalse(self.db.is_message_already_forwarded("src_2", 2001, "dest_1"))

        # Now retry and succeed
        self.db.record_forward_attempt({
            "source_channel_id": "src_2",
            "source_message_id": 2001,
            "destination_channel_id": "dest_1",
            "status": "success",
            "sent_message_id": 777
        })
        self.assertTrue(self.db.is_message_already_forwarded("src_2", 2001, "dest_1"))

if __name__ == '__main__':
    unittest.main()
