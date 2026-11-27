"""Tests for the real chat-session list aggregation (no database access)."""
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from .runtime.history import load_chat_sessions

MODEL_PATH = "apps.cms_chatbot.agent_pipeline.runtime.history.ChatHistories"


def _fake_model(rows, first_messages):
    query = MagicMock()
    annotated = MagicMock()
    annotated.order_by.return_value.__getitem__.return_value = rows
    query.values.return_value.annotate.return_value = annotated

    first_query = MagicMock()
    first_query.only.return_value = first_messages

    model = MagicMock()
    model.objects.filter.side_effect = [query, first_query]
    return model


class LoadChatSessionsTests(unittest.TestCase):
    def test_groups_sessions_and_builds_titles(self):
        when = datetime(2026, 11, 28, 9, 30, tzinfo=timezone.utc)
        rows = [
            {"session_id": "s1", "first_id": 1, "last_at": when, "turn_count": 2},
            {"session_id": "s2", "first_id": 2, "last_at": when, "turn_count": 1},
        ]
        first_messages = [
            SimpleNamespace(id=1, user_message="  Tạo   tour\nSơn Trà  "),
            SimpleNamespace(id=2, user_message=""),
        ]
        with patch(MODEL_PATH, _fake_model(rows, first_messages)):
            sessions = load_chat_sessions(SimpleNamespace(id=7))

        self.assertEqual([s["session_id"] for s in sessions], ["s1", "s2"])
        self.assertEqual(sessions[0]["title"], "Tạo tour Sơn Trà")
        self.assertEqual(sessions[0]["turn_count"], 2)
        self.assertEqual(sessions[0]["last_message_at"], when.isoformat())
        self.assertEqual(sessions[1]["title"], "Cuộc hội thoại")

    def test_empty_sessions(self):
        model = MagicMock()
        model.objects.filter.return_value.values.return_value.annotate.return_value.order_by.return_value.__getitem__.return_value = []
        with patch(MODEL_PATH, model):
            self.assertEqual(load_chat_sessions(SimpleNamespace(id=7)), [])

    def test_long_title_is_truncated(self):
        when = datetime(2026, 11, 28, 9, 30, tzinfo=timezone.utc)
        rows = [{"session_id": "s1", "first_id": 1, "last_at": when, "turn_count": 1}]
        first_messages = [SimpleNamespace(id=1, user_message="x" * 200)]
        with patch(MODEL_PATH, _fake_model(rows, first_messages)):
            sessions = load_chat_sessions(SimpleNamespace(id=7))
        self.assertLessEqual(len(sessions[0]["title"]), 80)
        self.assertTrue(sessions[0]["title"].endswith("..."))


if __name__ == "__main__":
    unittest.main()
