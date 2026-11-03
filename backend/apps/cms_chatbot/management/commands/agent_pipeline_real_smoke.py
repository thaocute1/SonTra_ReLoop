import os
from types import SimpleNamespace

from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIClient

from apps.tours.models.tour_models import Tours

from apps.cms_chatbot.agent_pipeline.core import ModelTurn, ToolCall, ToolContext
from apps.cms_chatbot.agent_pipeline.tools.catalog import execute_tool


class _SmokeProvider:
    name = "deepseek-smoke"
    model = "smoke-provider"

    def __init__(self, query: str) -> None:
        self.query = query
        self.messages = []

    def complete(self, messages, tools, iteration):
        self.messages.append(messages)
        if iteration == 0:
            return ModelTurn(
                provider=self.name,
                model=self.model,
                content=None,
                tool_calls=[
                    ToolCall(
                        id="real-db-smoke-call",
                        name="search_tours",
                        arguments={"query": self.query},
                    )
                ],
            )
        return ModelTurn(
            provider=self.name,
            model=self.model,
            content="Real database tool round trip completed.",
            tool_calls=[],
        )


class Command(BaseCommand):
    help = "Run a read-only real database and tool smoke test for the AI pipeline."

    def add_arguments(self, parser):
        parser.add_argument("--query", default="", help="Catalog query to send to search_tours.")
        parser.add_argument(
            "--http",
            action="store_true",
            help="Also run the authenticated HTTP view with a smoke provider.",
        )

    def handle(self, *args, **options):
        if os.getenv("AI_AGENT_REAL_DB_SMOKE", "").lower() != "true":
            raise CommandError(
                "Set AI_AGENT_REAL_DB_SMOKE=true explicitly; this command reads the configured database."
            )

        query = options["query"]
        rows = execute_tool(
            "search_tours",
            {"query": query},
            context=ToolContext(user=None, request_id="real-db-smoke"),
        )
        if len(rows) > 5:
            raise CommandError("search_tours exceeded the five-result limit.")
        if rows:
            ids = [row["id"] for row in rows]
            states = dict(Tours.objects.filter(id__in=ids).values_list("id", "status"))
            deleted = set(
                Tours.objects.filter(id__in=ids)
                .exclude(deleted_at=None)
                .values_list("id", flat=True)
            )
            if any(states.get(row_id) != "published" for row_id in ids) or deleted:
                raise CommandError("search_tours returned a non-published or deleted tour.")

        self.stdout.write(self.style.SUCCESS(f"tool_ok count={len(rows)} max_results=5"))

        if options["http"]:
            self._run_http_smoke(query)

    def _run_http_smoke(self, query: str) -> None:
        from unittest.mock import patch

        provider = _SmokeProvider(query)
        client = APIClient()
        client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, pk="real-db-smoke-user")
        )
        with patch(
            "apps.cms_chatbot.agent_pipeline.runtime.views.get_provider", return_value=provider
        ):
            response = client.post(
                "/api/v1/cms-chatbot/agent/chat/",
                {"message": "Find a published tour", "session_id": "real-db-smoke"},
                format="json",
            )
        if response.status_code != 200 or response.data.get("ok") is not True:
            raise CommandError(
                f"HTTP smoke failed with status {response.status_code} and code "
                f"{response.data.get('error', {}).get('code')}"
            )
        tool_message = provider.messages[-1][-1]
        if tool_message.get("role") != "tool" or tool_message.get("tool_call_id") != "real-db-smoke-call":
            raise CommandError("HTTP smoke did not preserve native tool_call_id protocol.")
        self.stdout.write(self.style.SUCCESS("http_ok authenticated_tool_round_trip=true"))
