"""Tests for the vendor tour-draft tool (plan §9).

Read-only tool: no database access, no TourService import. Covers the pure
normalizer, the adapter output, registry exposure and agent-loop blocks.
"""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from .core import AgentPipelineError, ModelTurn, ToolCall, ToolContext
from .runtime.agent import run_agent_loop
from .tools.catalog import registry_for_context
from .tools.tour_draft_adapter import suggest_tour_draft
from .tour_draft import CORE_FIELDS, normalize_draft_args


def make_user(**overrides):
    values = {
        "id": 7,
        "is_authenticated": True,
        "role": "vendor_admin",
        "name": "Đối Tác A",
        "email": "vendor@example.com",
        "phone": "0901234567",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def vendor_context(user=None, **overrides):
    values = {"user": user or make_user(), "request_id": "request-draft", "vendor_id": 3}
    values.update(overrides)
    return ToolContext(**values)


class QueueProvider:
    name = "deepseek"

    def __init__(self, turns):
        self.turns = list(turns)
        self.messages = []
        self.tool_definitions = []

    def complete(self, messages, tools, iteration):
        self.messages.append([dict(message) for message in messages])
        self.tool_definitions.append(tools)
        return self.turns.pop(0)


class NormalizeDraftArgsTests(unittest.TestCase):
    def test_valid_core_fields_are_preserved(self):
        payload = normalize_draft_args({
            "title": "  Trekking Bãi Bắc  ",
            "description": "Đi bộ ven biển",
            "difficulty_level": "easy",
            "duration_hours": 3.5,
            "price": 400000,
            "max_capacity": 12,
            "cover_image_url": "https://example.com/a.jpg",
        })
        self.assertEqual(payload["title"], "Trekking Bãi Bắc")
        self.assertEqual(payload["difficulty_level"], "easy")
        self.assertEqual(payload["duration_hours"], 3.5)
        self.assertEqual(payload["price"], 400000)
        self.assertEqual(payload["max_capacity"], 12)

    def test_missing_fields_are_not_defaulted(self):
        payload = normalize_draft_args({"title": "Tour nháp"})
        self.assertEqual(payload, {"title": "Tour nháp"})

    def test_empty_title_is_rejected(self):
        with self.assertRaises(AgentPipelineError) as error:
            normalize_draft_args({"title": "   "})
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_unknown_field_is_rejected(self):
        with self.assertRaises(AgentPipelineError) as error:
            normalize_draft_args({"title": "Tour", "vendor_id": 99})
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_invalid_difficulty_is_rejected(self):
        with self.assertRaises(AgentPipelineError) as error:
            normalize_draft_args({"title": "Tour", "difficulty_level": "expert"})
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_invalid_price_is_rejected(self):
        for value in (999, -1, "400000", True):
            with self.subTest(value=value):
                with self.assertRaises(AgentPipelineError) as error:
                    normalize_draft_args({"title": "Tour", "price": value})
                self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_invalid_capacity_is_rejected(self):
        for value in (0, 101, "15", True):
            with self.subTest(value=value):
                with self.assertRaises(AgentPipelineError) as error:
                    normalize_draft_args({"title": "Tour", "max_capacity": value})
                self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_invalid_duration_is_rejected(self):
        for value in (0, -1, "3", True):
            with self.subTest(value=value):
                with self.assertRaises(AgentPipelineError) as error:
                    normalize_draft_args({"title": "Tour", "duration_hours": value})
                self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_over_long_title_and_description_are_rejected(self):
        with self.assertRaises(AgentPipelineError):
            normalize_draft_args({"title": "x" * 256})
        with self.assertRaises(AgentPipelineError):
            normalize_draft_args({"title": "Tour", "description": "x" * 2001})


class SuggestTourDraftTests(unittest.TestCase):
    def test_output_shape_and_no_extra_fields(self):
        result = suggest_tour_draft({"title": "Tour A", "price": 500000}, vendor_context())
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["tool"], "suggest_tour_draft")
        self.assertEqual(result[0]["draft"], {"title": "Tour A", "price": 500000})
        self.assertTrue(set(result[0]["draft"]).issubset(CORE_FIELDS))

    def test_adapter_is_read_only(self):
        from .tools.tour_draft_adapter import VENDOR_TOUR_DRAFT_SPECS

        spec = VENDOR_TOUR_DRAFT_SPECS[0]
        self.assertTrue(spec.read_only)
        self.assertEqual(spec.allowed_roles, frozenset({"vendor_admin"}))
        self.assertEqual(spec.max_results, 1)


class RegistryTests(unittest.TestCase):
    def test_vendor_registry_exposes_draft_tool(self):
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "true"}):
            names = registry_for_context(vendor_context()).names()
        self.assertIn("suggest_tour_draft", names)

    def test_customer_registry_never_exposes_draft_tool(self):
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "true"}):
            names = registry_for_context(
                ToolContext(user=make_user(role="customer"), request_id="request-draft")
            ).names()
        self.assertNotIn("suggest_tour_draft", names)

    def test_feature_flag_disables_tool(self):
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "false"}):
            names = registry_for_context(vendor_context()).names()
        self.assertNotIn("suggest_tour_draft", names)


class VendorAgentLoopTests(unittest.TestCase):
    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_vendor_prompt_contains_draft_policy(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào đối tác.", tool_calls=[])]
        )
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "true"}):
            run_agent_loop("Xin chào", provider, context=vendor_context())
        system_message = provider.messages[0][0]["content"]
        self.assertIn("ĐỀ XUẤT BẢN NHÁP TRẢI NGHIỆM", system_message)
        self.assertIn("suggest_tour_draft", system_message)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_customer_prompt_has_no_draft_policy(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào bạn.", tool_calls=[])]
        )
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "true"}):
            run_agent_loop(
                "Xin chào",
                provider,
                context=ToolContext(user=make_user(role="customer"), request_id="r"),
            )
        system_message = provider.messages[0][0]["content"]
        self.assertNotIn("ĐỀ XUẤT BẢN NHÁP TRẢI NGHIỆM", system_message)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_draft_preview_block_is_emitted(self, execute_tool_mock):
        execute_tool_mock.return_value = [
            {"tool": "suggest_tour_draft", "draft": {"title": "Tour nháp"}}
        ]
        provider = QueueProvider([
            ModelTurn(
                provider="deepseek",
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call-1",
                        name="suggest_tour_draft",
                        arguments={"title": "Tour nháp"},
                    )
                ],
            ),
            ModelTurn(provider="deepseek", content="Đây là bản nháp.", tool_calls=[]),
        ])
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "true"}):
            result = run_agent_loop("Tạo tour", provider, context=vendor_context())
        self.assertEqual(result["blocks"], [
            {"type": "draft_preview", "items": [{"tool": "suggest_tour_draft", "draft": {"title": "Tour nháp"}}]}
        ])

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_provider_never_receives_identity_or_scope(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào đối tác.", tool_calls=[])]
        )
        with patch.dict(os.environ, {"AI_VENDOR_TOUR_DRAFT_ENABLED": "true"}):
            run_agent_loop("Xin chào", provider, context=vendor_context())
        rendered = str(provider.messages[0])
        for forbidden in ("vendor_id", "vendor@example.com", "0901234567"):
            self.assertNotIn(forbidden, rendered)


if __name__ == "__main__":
    unittest.main()
