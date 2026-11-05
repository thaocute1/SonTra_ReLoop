import os
import unittest
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.db import DatabaseError

from .runtime.agent import run_agent_loop
from .core import AgentPipelineError, ModelTurn, ToolCall, ToolContext, ToolSpec, ToolDispatcher, ToolRegistry
from .tools.tour_adapter import search_tours
from .runtime.providers import (
    DeepSeekProvider,
    _request_json,
    normalize_deepseek_response,
)
from .tools.catalog import TOOL_DEFINITIONS, execute_tool
from .admin_security import create_approval, require_approval, has_permission


class QueueProvider:
    name = "deepseek"

    def __init__(self, turns):
        self.turns = list(turns)
        self.messages = []

    def complete(self, messages, tools, iteration):
        self.messages.append([dict(message) for message in messages])
        return self.turns.pop(0)


class AdminAgentPolicyTests(unittest.TestCase):
    def test_staff_permissions_are_required(self):
        user = SimpleNamespace(is_authenticated=True, role="staff", staffs=SimpleNamespace(is_active=True, permissions=["admin.report.read"]))
        self.assertTrue(has_permission(user, "admin.report.read"))
        self.assertFalse(has_permission(user, "tour.admin.update"))

    def test_customer_cannot_use_admin_policy(self):
        user = SimpleNamespace(is_authenticated=True, role="customer")
        self.assertFalse(has_permission(user, "admin.report.read"))

    def test_approval_is_bound_to_payload_and_context(self):
        user = SimpleNamespace(id=7, is_authenticated=True, role="system_admin")
        context = ToolContext(user, "request-1")
        token = create_approval("archive_tour_admin", {"tour_id": 1}, context)
        require_approval("archive_tour_admin", {"tour_id": 1, "approval_token": token}, context)
        with self.assertRaises(AgentPipelineError) as error:
            require_approval("archive_tour_admin", {"tour_id": 2, "approval_token": token}, context)
        self.assertEqual(error.exception.code, "INVALID_APPROVAL")


class ProviderParsingTests(unittest.TestCase):
    @patch.dict(
        os.environ,
        {
            "AI_AGENT_DEEPSEEK_API_KEY": "test-key",
            "AI_AGENT_DEEPSEEK_MODEL": "deepseek-chat",
            "AI_AGENT_DEEPSEEK_BASE_URL": "https://api.deepseek.com",
        },
    )
    @patch("apps.cms_chatbot.agent_pipeline.runtime.providers._safe_urlopen")
    def test_provider_calls_deepseek_chat_completions_api(self, urlopen_mock):
        urlopen_mock.return_value = BytesIO(
            b'{"choices":[{"message":{"content":"Xin chao","tool_calls":[]}}]}'
        )
        provider = DeepSeekProvider()

        turn = provider.complete(
            [{"role": "user", "content": "Xin chao"}],
            TOOL_DEFINITIONS,
            iteration=0,
        )

        request = urlopen_mock.call_args.args[0]
        self.assertEqual(
            request.full_url, "https://api.deepseek.com/chat/completions"
        )
        self.assertEqual(request.get_method(), "POST")
        self.assertTrue(request.has_header("Authorization"))
        self.assertEqual(turn.provider, "deepseek")
        self.assertEqual(turn.content, "Xin chao")
        self.assertEqual(
            __import__("json").loads(request.data.decode("utf-8"))["max_tokens"],
            1024,
        )

    @patch.dict(os.environ, {"AI_AGENT_ENABLED": "false"}, clear=False)
    def test_agent_can_be_disabled_without_provider_call(self):
        from .runtime.providers import get_provider

        with self.assertRaises(AgentPipelineError) as context:
            get_provider()
        self.assertEqual(context.exception.code, "AGENT_DISABLED")

    def test_deepseek_tool_call_preserves_native_id(self):
        turn = normalize_deepseek_response(
            {
                "choices": [
                    {
                        "message": {
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "call-1",
                                    "function": {
                                        "name": "search_tours",
                                        "arguments": '{"query":"trek"}',
                                    },
                                }
                            ],
                        }
                    }
                ]
            }
        )
        self.assertEqual(turn.tool_calls[0].id, "call-1")

    def test_malformed_deepseek_arguments_are_rejected(self):
        with self.assertRaises(AgentPipelineError) as context:
            normalize_deepseek_response(
                {
                    "choices": [
                        {
                            "message": {
                                "tool_calls": [
                                    {
                                        "id": "call-1",
                                        "function": {
                                            "name": "search_tours",
                                            "arguments": "{broken}",
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            )
        self.assertEqual(context.exception.code, "MALFORMED_TOOL_CALL")

    @patch(
        "apps.cms_chatbot.agent_pipeline.runtime.providers._safe_urlopen",
        side_effect=URLError(TimeoutError()),
    )
    def test_provider_timeout_is_reported_without_transport_details(self, _urlopen):
        with self.assertRaises(AgentPipelineError) as context:
            _request_json("https://provider.invalid", {}, {}, 1)
        self.assertEqual(context.exception.code, "PROVIDER_TIMEOUT")
        self.assertNotIn("api_key", context.exception.message)

    @patch(
        "apps.cms_chatbot.agent_pipeline.runtime.providers._safe_urlopen",
        side_effect=HTTPError("https://api.deepseek.com", 503, "unavailable", {}, None),
    )
    def test_provider_http_error_is_normalized(self, _urlopen):
        with self.assertRaises(AgentPipelineError) as context:
            _request_json("https://api.deepseek.com", {}, {}, 1)
        self.assertEqual(context.exception.code, "MODEL_PROVIDER_ERROR")
        self.assertNotIn("unavailable", context.exception.message)


class AgentLoopTests(unittest.TestCase):
    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    def test_deepseek_tool_result_uses_native_tool_protocol(self, search_tours):
        search_tours.return_value = [{"id": 7, "title": "Son Tra Trek"}]
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall(
                            id="call-1",
                            name="search_tours",
                            arguments={"query": "trek"},
                        )
                    ],
                ),
                ModelTurn(
                    provider="deepseek",
                    content="Có tour Son Tra Trek.",
                    tool_calls=[],
                ),
            ]
        )

        result = run_agent_loop("Tìm tour trek", provider)

        continuation = provider.messages[1]
        self.assertEqual(continuation[-2]["role"], "assistant")
        self.assertEqual(continuation[-2]["tool_calls"][0]["id"], "call-1")
        self.assertEqual(continuation[-1]["role"], "tool")
        self.assertEqual(continuation[-1]["tool_call_id"], "call-1")
        self.assertEqual(result["answer"], "Có tour Son Tra Trek.")
        self.assertEqual(result["trace"][1]["result_count"], 1)

    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    def test_unregistered_tool_is_rejected(self, search_tours):
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall(
                            id="call-1",
                            name="create_record",
                            arguments={"query": "ignored"},
                        )
                    ],
                )
            ]
        )

        with self.assertRaises(AgentPipelineError) as context:
            run_agent_loop("create a record", provider)

        self.assertEqual(context.exception.code, "UNKNOWN_TOOL")
        search_tours.assert_not_called()

    def test_registry_contains_only_read_only_tour_search(self):
        self.assertEqual([tool["name"] for tool in TOOL_DEFINITIONS], ["search_tours"])
        with self.assertRaises(AgentPipelineError) as context:
            execute_tool("update_record", {})
        self.assertEqual(context.exception.code, "UNKNOWN_TOOL")

    def test_tool_rejects_unknown_arguments(self):
        with self.assertRaises(AgentPipelineError) as context:
            execute_tool("search_tours", {"query": "trek", "entity": "tours"})
        self.assertEqual(context.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_agent_rejects_tool_calls_above_per_turn_limit(self):
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall("call-1", "search_tours", {"query": "one"}),
                        ToolCall("call-2", "search_tours", {"query": "two"}),
                        ToolCall("call-3", "search_tours", {"query": "three"}),
                        ToolCall("call-4", "search_tours", {"query": "four"}),
                    ],
                )
            ]
        )
        with self.assertRaises(AgentPipelineError) as context:
            run_agent_loop("find tours", provider)
        self.assertEqual(context.exception.code, "TOOL_CALL_LIMIT")

    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    def test_agent_preserves_multiple_tool_results_sequentially(self, search_tours):
        search_tours.side_effect = [
            [{"id": 1, "title": "One"}],
            [{"id": 2, "title": "Two"}],
        ]
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall("call-1", "search_tours", {"query": "one"}),
                        ToolCall("call-2", "search_tours", {"query": "two"}),
                    ],
                ),
                ModelTurn(provider="deepseek", content="Có hai kết quả.", tool_calls=[]),
            ]
        )
        result = run_agent_loop("Tìm hai nhóm tour", provider)
        self.assertEqual(result["answer"], "Có hai kết quả.")
        self.assertEqual(search_tours.call_count, 2)
        self.assertEqual(provider.messages[1][2]["tool_calls"][1]["id"], "call-2")

    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    def test_agent_reuses_duplicate_tool_result_within_request(self, search_tours):
        search_tours.return_value = [{"id": 1, "title": "One"}]
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall("call-1", "search_tours", {"query": "one"}),
                        ToolCall("call-2", "search_tours", {"query": "one"}),
                    ],
                ),
                ModelTurn(provider="deepseek", content="Có tour.", tool_calls=[]),
            ]
        )
        result = run_agent_loop("Tìm tour one", provider)
        self.assertEqual(result["answer"], "Có tour.")
        search_tours.assert_called_once_with("one")
        self.assertTrue(result["trace"][2]["cached"])


class ToolArchitectureTests(unittest.TestCase):
    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    def test_tour_search_extracts_duration_filter_from_vietnamese_query(self, search):
        search.return_value = []
        search_tours({"query": "tour dưới 6 giờ"}, ToolContext(None, "request-1"))
        search.assert_called_once_with("", {"max_duration_hours": 6.0})

    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    def test_tour_search_accepts_structured_filters(self, search):
        search.return_value = []
        search_tours(
            {"query": "Bãi Bắc", "max_price": 500000, "difficulty_level": "easy"},
            ToolContext(None, "request-1"),
        )
        search.assert_called_once_with(
            "Bãi Bắc", {"max_price": 500000, "difficulty_level": "easy"}
        )

    def test_registry_exposes_only_allowlisted_tools(self):
        from .tools.catalog import TOOL_REGISTRY

        self.assertEqual(TOOL_REGISTRY.names(), ["search_tours"])

    def test_dispatcher_passes_backend_context_to_handler(self):
        received = []

        def handler(arguments, context):
            received.append((arguments, context))
            return []

        registry = ToolRegistry(
            [
                ToolSpec(
                    name="test_tool",
                    description="test",
                    parameters={"type": "object"},
                    handler=handler,
                )
            ]
        )
        context = ToolContext(user=object(), request_id="request-1")
        ToolDispatcher(registry).dispatch("test_tool", {}, context)
        self.assertIs(received[0][1], context)

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours",
        side_effect=DatabaseError(),
    )
    def test_tour_adapter_normalizes_database_failure(self, _search):
        with self.assertRaises(AgentPipelineError) as context:
            search_tours({"query": "trek"}, ToolContext(None, "request-1"))
        self.assertEqual(context.exception.code, "BACKEND_UNAVAILABLE")


class ChatEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import django

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
        django.setup()

    def setUp(self):
        from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

        self.client = APIClient()
        self.factory = APIRequestFactory()
        self.force_authenticate = force_authenticate

    def test_chat_url_is_exposed_by_additive_urlconf(self):
        from django.urls import resolve

        match = resolve("/api/v1/cms-chatbot/agent/chat/")
        self.assertEqual(match.url_name, "agent-chat")

    def test_chat_requires_authenticated_principal(self):
        response = self.client.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {"message": "Tìm tour", "session_id": "test-1"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.get_provider")
    def test_chat_rejects_client_supplied_role(self, get_provider_mock):
        from .runtime.views import chat

        request = self.factory.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {
                "message": "Tìm tour",
                "session_id": "test-1",
                "role": "admin",
            },
            format="json",
        )
        self.force_authenticate(
            request, user=SimpleNamespace(is_authenticated=True, role="customer")
        )
        response = chat(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "INVALID_REQUEST")
        get_provider_mock.assert_not_called()

    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.get_provider")
    def test_chat_rejects_client_provider_selection(self, get_provider_mock):
        from .runtime.views import chat

        request = self.factory.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {
                "message": "Tìm tour",
                "session_id": "test-1",
                "provider": "frog",
            },
            format="json",
        )
        self.force_authenticate(
            request, user=SimpleNamespace(is_authenticated=True, role="customer")
        )
        response = chat(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "INVALID_REQUEST")
        get_provider_mock.assert_not_called()

    def test_chat_rejects_non_object_request_body(self):
        from .runtime.views import chat

        request = self.factory.post(
            "/api/v1/cms-chatbot/agent/chat/",
            ["not", "an", "object"],
            format="json",
        )
        self.force_authenticate(
            request, user=SimpleNamespace(is_authenticated=True, role="customer")
        )
        response = chat(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "INVALID_REQUEST")

    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.get_provider")
    def test_authenticated_chat_returns_envelope(
        self, get_provider_mock, search_tours_mock
    ):
        search_tours_mock.return_value = [{"id": 7, "title": "Son Tra Trek"}]
        get_provider_mock.return_value = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content="Có tour Son Tra Trek.",
                    tool_calls=[],
                )
            ]
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, role="customer")
        )
        response = self.client.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {
                "message": "Tìm tour",
                "session_id": "test-1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["session_id"], "test-1")
        self.assertEqual(response.data["error"], None)
        get_provider_mock.assert_called_once_with()

    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.get_provider")
    def test_authenticated_chat_provider_failure_returns_error_envelope(self, get_provider_mock):
        get_provider_mock.side_effect = AgentPipelineError(
            "PROVIDER_TIMEOUT", "Provider request timed out.", 504
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, role="customer")
        )
        response = self.client.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {"message": "Tìm tour", "session_id": "test-timeout"},
            format="json",
        )
        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.data["ok"], False)
        self.assertEqual(response.data["error"]["code"], "PROVIDER_TIMEOUT")
        self.assertEqual(response.data["answer"], "")

    @patch("apps.cms_chatbot.agent_pipeline.tools.tour_adapter.search_published_tours")
    @patch("apps.cms_chatbot.agent_pipeline.runtime.views.get_provider")
    def test_authenticated_http_tool_round_trip_uses_tool_protocol(
        self, get_provider_mock, search_tours_mock
    ):
        search_tours_mock.return_value = []
        get_provider_mock.return_value = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall(
                            id="call-http-1",
                            name="search_tours",
                            arguments={"query": "không có"},
                        )
                    ],
                ),
                ModelTurn(
                    provider="deepseek",
                    content="Không tìm thấy tour phù hợp.",
                    tool_calls=[],
                ),
            ]
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, role="customer")
        )
        response = self.client.post(
            "/api/v1/cms-chatbot/agent/chat/",
            {"message": "Tìm tour không có", "session_id": "test-empty"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["answer"], "Không tìm thấy tour phù hợp.")
        search_tours_mock.assert_called_once_with("không có")

