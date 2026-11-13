"""Core contracts, registry and dispatcher for the agent pipeline."""
import json
import time
from dataclasses import dataclass
from typing import Any, Callable


class AgentPipelineError(Exception):
    def __init__(self, code: str, message: str, http_status: int = 502) -> None:
        super().__init__(message); self.code = code; self.message = message; self.http_status = http_status


@dataclass(frozen=True)
class ToolContext:
    user: Any
    request_id: str
    locale: str = "vi-VN"
    # Backend-owned scope.  It is never accepted from model/tool arguments.
    vendor_id: int | None = None
    # Backend-computed health indicators (HealthProfile | None). Typed as Any to
    # avoid a circular import; never serialized and never sent as tool arguments.
    health_profile: Any | None = None

    @classmethod
    def from_request(cls, request, request_id: str, locale: str = "vi-VN"):
        user = getattr(request, "user", None)
        vendor_id = getattr(user, "vendor_id", None)
        if vendor_id is None and getattr(user, "role", None) == "vendor_admin":
            try:
                from apps.vendors.models import Vendors
                vendor_id = Vendors.objects.only("id").get(user_id=user.id).id
            except Exception:
                # Missing ownership is a deny condition, not a fallback scope.
                vendor_id = None
        return cls(
            user=user,
            request_id=request_id,
            locale=locale,
            vendor_id=vendor_id,
            health_profile=_health_profile_for(user),
        )


def _health_profile_for(user):
    """Build the health profile from the authenticated user only.

    A failure here must never block a chat request: without a profile the
    recommendation tools simply fall back to a normal published-tour search.
    """
    if user is None:
        return None
    try:
        from .health import HealthProfile
        return HealthProfile.from_user(user)
    except Exception:
        return None


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[[dict[str, Any], ToolContext], list[dict[str, Any]]]
    read_only: bool = True
    destructive: bool = False
    idempotent: bool = True
    open_world: bool = False
    scope: str = ""
    max_results: int = 5
    max_input_length: int = 200
    timeout_seconds: float = 5.0
    permission: str = ""
    allowed_roles: frozenset[str] = frozenset()

    def provider_definition(self) -> dict[str, Any]:
        return {"name": self.name, "description": self.description, "parameters": self.parameters}


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ModelTurn:
    provider: str
    content: str | None
    tool_calls: list[ToolCall]
    model: str = ""


class ToolRegistry:
    def __init__(self, specs: list[ToolSpec]) -> None:
        self._specs = {spec.name: spec for spec in specs}

    def get(self, name: str) -> ToolSpec:
        try: return self._specs[name]
        except KeyError: raise AgentPipelineError("UNKNOWN_TOOL", "This tool is not available.", 400)

    def provider_definitions(self) -> list[dict]: return [spec.provider_definition() for spec in self._specs.values()]
    def names(self) -> list[str]: return list(self._specs)
    def specs(self) -> list[ToolSpec]: return list(self._specs.values())
    def filtered(self, predicate) -> "ToolRegistry": return ToolRegistry([s for s in self._specs.values() if predicate(s)])


class ToolDispatcher:
    def __init__(self, registry: ToolRegistry) -> None: self.registry = registry

    def dispatch(self, name: str, arguments: dict[str, Any], context: ToolContext) -> list[dict[str, Any]]:
        spec = self.registry.get(name)
        if spec.permission or spec.allowed_roles:
            from .admin_security import authorize_spec
            authorize_spec(spec, context)
        if not isinstance(arguments, dict): raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "Tool arguments must be an object.", 400)
        started = time.perf_counter(); result = spec.handler(arguments, context)
        if time.perf_counter() - started > spec.timeout_seconds: raise AgentPipelineError("TOOL_TIMEOUT", "The tool took too long to complete.", 504)
        if len(result) > spec.max_results or len(json.dumps(result, ensure_ascii=False)) > 32_000:
            raise AgentPipelineError("TOOL_RESULT_TOO_LARGE", "The tool result exceeded the size limit.", 502)
        return result
