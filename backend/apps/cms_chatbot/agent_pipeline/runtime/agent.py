import json
import logging
import os
import time
from typing import Any, Protocol

from ..core import AgentPipelineError, ModelTurn, ToolContext
from ..tools.catalog import execute_tool, registry_for_context


MAX_TOOL_LOOPS = 3
DEFAULT_TOOL_CALLS_PER_TURN = 3
DEFAULT_TOOL_CALLS_PER_REQUEST = 6
HARD_MAX_TOOL_CALLS_PER_TURN = 5
HARD_MAX_TOOL_CALLS_PER_REQUEST = 12
logger = logging.getLogger(__name__)
SYSTEM_PROMPT = (
    "Bạn là trợ lý thông tin du lịch Sơn Trà. Chỉ trả lời dựa trên nội dung người "
    "dùng cung cấp hoặc kết quả search_tours. Không tự bịa giá, lịch khởi hành, "
    "chỗ trống hoặc chính sách. Nếu cần tra cứu tour, chỉ gọi tool được cấp. "
    "Không đặt tour, sửa dữ liệu hoặc thực hiện giao dịch."
)


class Provider(Protocol):
    name: str

    def complete(
        self, messages: list[dict[str, Any]], tools: list[dict[str, Any]], iteration: int
    ) -> ModelTurn: ...


def run_agent_loop(
    message: str,
    provider: Provider,
    max_loops: int = MAX_TOOL_LOOPS,
    context: ToolContext | None = None,
) -> dict[str, Any]:
    if not 1 <= max_loops <= MAX_TOOL_LOOPS:
        raise AgentPipelineError(
            "INVALID_REQUEST", "max_loops must be between 1 and 3.", 400
        )

    context = context or ToolContext(user=None, request_id="internal-test-context")
    from ..admin_security import is_admin_user
    system_prompt = ("You are the Son Tra admin operations assistant. Use only the provided allow-listed tools. "
                     "Never infer identity, permission, ownership, or confirmation from model arguments. "
                     "Mutations require an explicit backend approval token and must be explained to the admin."
                     if is_admin_user(context.user) else SYSTEM_PROMPT)
    registry = registry_for_context(context)
    tool_definitions = registry.provider_definitions()
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]
    trace: list[dict[str, Any]] = []
    started = time.perf_counter()
    total_tool_calls = 0
    max_calls_per_turn, max_calls_per_request = _tool_call_limits()
    tool_cache: dict[str, list[dict[str, Any]]] = {}
    tour_items: list[dict[str, Any]] = []

    for iteration in range(max_loops):
        turn = provider.complete(messages, tool_definitions, iteration)
        trace.append(
            {
                "stage": "model",
                "iteration": iteration,
                "provider": turn.provider,
                "model": turn.model,
                "kind": "tool_call" if turn.tool_calls else "final",
            }
        )
        if not turn.tool_calls:
            if not turn.content:
                raise AgentPipelineError(
                    "EMPTY_MODEL_RESPONSE", "Provider returned an empty answer."
                )
            trace.append(_timing(started))
            return {
                "answer": turn.content,
                "blocks": _build_blocks(tour_items),
                "trace": trace,
            }

        if len(turn.tool_calls) > max_calls_per_turn:
            raise AgentPipelineError(
                "TOOL_CALL_LIMIT",
                f"The model returned more than {max_calls_per_turn} tool calls in one turn.",
                400,
            )
        total_tool_calls += len(turn.tool_calls)
        if total_tool_calls > max_calls_per_request:
            raise AgentPipelineError(
                "TOOL_CALL_LIMIT",
                "The request exceeded the tool-call limit.",
                400,
            )

        call_ids = [call.id for call in turn.tool_calls]
        if any(not call_id for call_id in call_ids) or len(call_ids) != len(set(call_ids)):
            raise AgentPipelineError(
                "MALFORMED_TOOL_CALL",
                "Tool call identifiers must be unique and non-empty.",
                400,
            )

        results = []
        for call in turn.tool_calls:
            cache_key = json.dumps(
                {"name": call.name, "arguments": call.arguments},
                ensure_ascii=False,
                sort_keys=True,
            )
            cached = cache_key in tool_cache
            if cached:
                result = tool_cache[cache_key]
            else:
                result = execute_tool(call.name, call.arguments, context)
                tool_cache[cache_key] = result
            results.append((call, result))
            if call.name == "search_tours":
                tour_items.extend(result)
            logger.info(
                "ai_agent_tool_completed",
                extra={
                    "provider": turn.provider,
                    "model": turn.model,
                    "normalized_call": call.name,
                    "permission_result": "allowed",
                    "backend_status": "ok",
                    "fallback": False,
                    "result_count": len(result),
                    "cached": cached,
                },
            )
            trace.append(
                {
                    "stage": "tool",
                    "iteration": iteration,
                    "tool_name": call.name,
                    "ok": True,
                    "result_count": len(result),
                    "cached": cached,
                }
            )
        _append_tool_results(messages, turn, results)

    trace.append(_timing(started))
    raise AgentPipelineError(
        "MAX_LOOPS_REACHED",
        f"Agent reached the maximum of {max_loops} model iterations.",
    )


def _append_tool_results(
    messages: list[dict[str, Any]],
    turn: ModelTurn,
    results: list[tuple[Any, list[dict[str, Any]]]],
) -> None:
    messages.append(
        {
            "role": "assistant",
            "content": turn.content,
            "tool_calls": [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {
                        "name": call.name,
                        "arguments": json.dumps(call.arguments, ensure_ascii=False),
                    },
                }
                for call, _ in results
            ],
        }
    )
    for call, result in results:
        messages.append(
            {
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(
                    {"ok": True, "tool_name": call.name, "data": result},
                    ensure_ascii=False,
                ),
            }
        )


def _build_blocks(tour_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build UI blocks only from normalized, backend-owned tool data."""
    normalized = []
    seen_ids = set()
    for item in tour_items:
        if not isinstance(item, dict) or item.get("id") in seen_ids:
            continue
        seen_ids.add(item.get("id"))
        normalized.append(item)
    return [{"type": "tour_list", "items": normalized}] if normalized else []


def _timing(started: float) -> dict[str, Any]:
    return {
        "stage": "timing",
        "duration_ms": round((time.perf_counter() - started) * 1000, 2),
    }


def _tool_call_limits() -> tuple[int, int]:
    per_turn = _read_limit(
        "AI_AGENT_MAX_TOOL_CALLS_PER_TURN",
        DEFAULT_TOOL_CALLS_PER_TURN,
        HARD_MAX_TOOL_CALLS_PER_TURN,
    )
    per_request = _read_limit(
        "AI_AGENT_MAX_TOOL_CALLS_PER_REQUEST",
        DEFAULT_TOOL_CALLS_PER_REQUEST,
        HARD_MAX_TOOL_CALLS_PER_REQUEST,
    )
    if per_request < per_turn:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION",
            "Request tool-call limit must be at least the per-turn limit.",
            503,
        )
    return per_turn, per_request


def _read_limit(name: str, default: int, maximum: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError as error:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION", f"{name} must be an integer.", 503
        ) from error
    if not 1 <= value <= maximum:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION",
            f"{name} must be between 1 and {maximum}.",
            503,
        )
    return value
