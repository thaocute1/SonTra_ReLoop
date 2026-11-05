import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from rest_framework.test import APIClient

from .core import ModelTurn, ToolCall, ToolContext
from .runtime.agent import run_agent_loop
from .runtime.history import load_chat_history, save_chat_turn
from .runtime.response_schema import (
    parse_and_validate_response,
    validate_and_normalize_chart,
)


class MockQueueProvider:
    name = "deepseek"

    def __init__(self, turns):
        self.turns = list(turns)
        self.model = "deepseek-chat"
        self.received_messages = []

    def complete(self, messages, tools, iteration):
        self.received_messages.append([dict(m) for m in messages])
        return self.turns.pop(0)


class ResponseSchemaTests(unittest.TestCase):
    def test_plain_text_produces_single_text_part(self):
        parts, answer = parse_and_validate_response("Xin chào! Tôi có thể giúp gì cho bạn?")
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0]["type"], "text")
        self.assertEqual(parts[0]["text"], "Xin chào! Tôi có thể giúp gì cho bạn?")
        self.assertEqual(answer, "Xin chào! Tôi có thể giúp gì cho bạn?")

    def test_json_with_text_and_chart_matches_schema(self):
        raw = json.dumps({
            "parts": [
                {
                    "type": "text",
                    "text": "Doanh thu tăng trong các tháng đầu năm."
                },
                {
                    "type": "chart",
                    "chart": {
                        "type": "bar",
                        "title": "Doanh thu theo tháng",
                        "description": "Đơn vị: VND",
                        "xField": "label",
                        "series": [
                            {
                                "field": "revenue",
                                "name": "Doanh thu",
                                "type": "bar"
                            }
                        ],
                        "data": [
                            {"label": "Tháng 1", "revenue": 10000000},
                            {"label": "Tháng 2", "revenue": 15000000}
                        ]
                    }
                }
            ]
        })
        parts, answer = parse_and_validate_response(raw)
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[0]["type"], "text")
        self.assertEqual(parts[0]["text"], "Doanh thu tăng trong các tháng đầu năm.")
        self.assertEqual(answer, "Doanh thu tăng trong các tháng đầu năm.")

        chart_part = parts[1]
        self.assertEqual(chart_part["type"], "chart")
        chart = chart_part["chart"]
        self.assertEqual(chart["type"], "bar")
        self.assertEqual(chart["title"], "Doanh thu theo tháng")
        self.assertEqual(chart["description"], "Đơn vị: VND")
        self.assertEqual(chart["xField"], "label")
        self.assertEqual(len(chart["series"]), 1)
        self.assertEqual(chart["series"][0]["field"], "revenue")
        self.assertEqual(chart["series"][0]["name"], "Doanh thu")
        self.assertEqual(chart["series"][0]["type"], "bar")
        self.assertEqual(len(chart["data"]), 2)
        self.assertEqual(chart["data"][0], {"label": "Tháng 1", "revenue": 10000000})

    def test_markdown_code_fence_json_parsing(self):
        content = (
            "Dưới đây là biểu đồ thống kê:\n"
            "```json\n"
            "{\n"
            '  "parts": [\n'
            '    {\n'
            '      "type": "chart",\n'
            '      "chart": {\n'
            '        "type": "line",\n'
            '        "title": "Lượt khách",\n'
            '        "description": "Năm 2026",\n'
            '        "xField": "month",\n'
            '        "series": [{"field": "visitors", "name": "Khách"}],\n'
            '        "data": [{"month": "T1", "visitors": 500}]\n'
            "      }\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "```\n"
            "Mọi số liệu đã được xác thực."
        )
        parts, answer = parse_and_validate_response(content)
        self.assertGreaterEqual(len(parts), 2)
        types = [p["type"] for p in parts]
        self.assertIn("text", types)
        self.assertIn("chart", types)
        self.assertIn("Dưới đây là biểu đồ thống kê:", answer)

    def test_chart_normalization_handles_missing_optional_fields(self):
        raw_chart = {
            "title": "Biểu đồ sơ sài",
            "data": [{"label": "A", "val": 10}, {"label": "B", "val": 20}]
        }
        normalized = validate_and_normalize_chart(raw_chart)
        self.assertIsNotNone(normalized)
        self.assertEqual(normalized["type"], "bar")
        self.assertEqual(normalized["title"], "Biểu đồ sơ sài")
        self.assertEqual(normalized["description"], "")
        self.assertEqual(normalized["xField"], "label")
        self.assertGreaterEqual(len(normalized["series"]), 1)
        self.assertEqual(normalized["series"][0]["field"], "val")
        self.assertEqual(len(normalized["data"]), 2)

    def test_invalid_chart_is_handled_safely(self):
        raw = json.dumps({"parts": [{"type": "chart", "chart": "not a dict"}]})
        parts, answer = parse_and_validate_response(raw)
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0]["type"], "text")

    def test_agent_loop_returns_validated_parts(self):
        provider = MockQueueProvider([
            ModelTurn(
                provider="deepseek",
                content=json.dumps({
                    "parts": [
                        {"type": "text", "text": "Thống kê tháng này."},
                        {
                            "type": "chart",
                            "chart": {
                                "type": "pie",
                                "title": "Tỷ lệ tour",
                                "description": "Tỷ lệ",
                                "xField": "category",
                                "series": [{"field": "count", "name": "Số lượng"}],
                                "data": [{"category": "Trekking", "count": 10}]
                            }
                        }
                    ]
                }),
                tool_calls=[],
            )
        ])
        result = run_agent_loop("Xem tỷ lệ", provider, max_loops=1)
        self.assertIn("parts", result)
        self.assertEqual(len(result["parts"]), 2)
        self.assertEqual(result["parts"][0]["type"], "text")
        self.assertEqual(result["parts"][1]["type"], "chart")
        self.assertEqual(result["parts"][1]["chart"]["type"], "pie")
        self.assertEqual(result["answer"], "Thống kê tháng này.")


class ViewResponsePartsTests(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.save_chat_turn")
    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.get_provider")
    def test_chat_view_returns_parts_in_message_payload(self, get_provider_mock, save_chat_turn_mock):
        chart_json = json.dumps({
            "parts": [
                {"type": "text", "text": "Báo cáo doanh thu:"},
                {
                    "type": "chart",
                    "chart": {
                        "type": "bar",
                        "title": "Doanh thu theo tháng",
                        "description": "Đơn vị: VND",
                        "xField": "label",
                        "series": [{"field": "revenue", "name": "Doanh thu", "type": "bar"}],
                        "data": [{"label": "T1", "revenue": 5000000}]
                    }
                }
            ]
        })
        get_provider_mock.return_value = MockQueueProvider([
            ModelTurn(provider="deepseek", content=chart_json, tool_calls=[])
        ])

        self.client.force_authenticate(
            user=SimpleNamespace(id=1, is_authenticated=True, role="system_admin")
        )
        response = self.client.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {"message": "Cho xem doanh thu", "session_id": "test-chart-parts"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertIn("message", response.data)
        parts = response.data["message"]["parts"]
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[0]["type"], "text")
        self.assertEqual(parts[0]["text"], "Báo cáo doanh thu:")
        self.assertEqual(parts[1]["type"], "chart")
        self.assertEqual(parts[1]["chart"]["title"], "Doanh thu theo tháng")
        self.assertEqual(parts[1]["chart"]["data"], [{"label": "T1", "revenue": 5000000}])

        save_chat_turn_mock.assert_called_once()
        args, kwargs = save_chat_turn_mock.call_args
        self.assertEqual(args[3], "Báo cáo doanh thu:")
        self.assertEqual(args[5], parts)

    def test_vendor_admin_gets_vendor_specific_system_prompt(self):
        user = SimpleNamespace(id=2, is_authenticated=True, role="vendor_admin", vendor_id=5)
        context = ToolContext(user=user, request_id="vendor-test", vendor_id=5)
        provider = MockQueueProvider([
            ModelTurn(
                provider="deepseek",
                content=json.dumps({"parts": [{"type": "text", "text": "Báo cáo đối tác."}]}),
                tool_calls=[],
            )
        ])
        result = run_agent_loop("Xem doanh thu", provider, max_loops=1, context=context)
        self.assertEqual(result["answer"], "Báo cáo đối tác.")
        # Verify vendor prompt was sent to model
        first_turn_messages = provider.received_messages[0]
        system_msg = first_turn_messages[0]["content"]
        self.assertIn("trợ lý kinh doanh và vận hành dành cho đối tác", system_msg)
