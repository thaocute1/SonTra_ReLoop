import json
import logging
import os
import time
from typing import Any, Protocol

from ..core import AgentPipelineError, ModelTurn, ToolContext
from ..tools.catalog import (
    execute_tool,
    health_method,
    health_recommendation_enabled,
    registry_for_context,
)
from .response_schema import (
    CHART_RESPONSE_SCHEMA_INSTRUCTION,
    parse_and_validate_response,
)


MAX_TOOL_LOOPS = 3
DEFAULT_TOOL_CALLS_PER_TURN = 3
DEFAULT_TOOL_CALLS_PER_REQUEST = 6
HARD_MAX_TOOL_CALLS_PER_TURN = 5
HARD_MAX_TOOL_CALLS_PER_REQUEST = 12
logger = logging.getLogger(__name__)

# Tool results that may become UI tour cards (backend-owned data only).
TOUR_RESULT_TOOLS = frozenset(
    {"search_tours", "search_tours_by_health", "search_tours_by_ai_filter"}
)

SYSTEM_PROMPT = (
    "Bạn là trợ lý du lịch Sơn Trà. Chỉ trả lời dựa trên nội dung người "
    "dùng cung cấp hoặc kết quả search_tours. Không tự bịa giá, lịch khởi hành, "
    "chỗ trống hoặc chính sách. Nếu cần tra cứu tour, chỉ gọi tool được cấp. "
    "Không đặt tour, sửa dữ liệu hoặc thực hiện giao dịch."
)

HEALTH_RECOMMENDATION_POLICY = (
    "\n\nHƯỚNG DẪN GỢI Ý TOUR THEO SỨC KHỎE:"
    "\n- Khi người dùng hỏi tour phù hợp với sức khỏe, thể lực, hoặc điều kiện thể chất, "
    "hãy gọi tool {tool_name}."
    "\n- Không hỏi người dùng về tuổi, cân nặng, chiều cao, BMI hay chỉ số sức khỏe nào."
    "\n- Tuyệt đối không đề cập hoặc tiết lộ bất kỳ thông tin sức khỏe cá nhân "
    "của người dùng trong câu trả lời."
    "\n- Chỉ trình bày kết quả tour và lý do phù hợp dựa trên độ khó địa hình."
)

TOUR_CARD_RESPONSE_POLICY = (
    "\n\nNGUYÊN TẮC TRẢ LỜI KHI CÓ TOUR CARD:"
    "\n- Hệ thống tự hiển thị card cho từng tour trong kết quả tool (ảnh, tên, độ khó, thời lượng, đánh giá, nút xem chi tiết)."
    "\n- Trong phần text, KHÔNG lặp lại thông tin đã có trên card: không liệt kê lại độ khó, thời lượng, đánh giá, "
    "mô tả hay điểm nhấn, không viết mỗi tour một đoạn."
    "\n- Chỉ nêu tên tour khi cần nhắc tới, ví dụ: “Mình gợi ý tour A, tour B và tour C.”; "
    "nếu cần so sánh thì thêm tối đa một lý do ngắn cho lựa chọn nổi bật."
    "\n- Chỉ nêu giá khi người dùng hỏi về giá/ngân sách hoặc khi so sánh giá giữa các tour."
    "\n- Độ dài: tối đa 3–4 câu khi trả về danh sách tour, 2–3 câu khi chỉ có một tour."
    "\n- Không mở bài dài và không nhắc lại toàn bộ yêu cầu của người dùng; có thể kết thúc bằng một câu hỏi ngắn."
)

ADMIN_BASE_PROMPT = (
    "Bạn là trợ lý quản trị và vận hành hệ thống Sơn Trà (Son Tra Operations Assistant). "
    "Sử dụng các công cụ allow-listed được cấp để tra cứu và phân tích dữ liệu quản trị. "
    "Các thao tác thay đổi dữ liệu yêu cầu approval token từ backend."
)

VENDOR_BASE_PROMPT = (
    "Bạn là trợ lý kinh doanh và vận hành dành cho đối tác Sơn Trà (Son Tra Vendor Operations Assistant). "
    "Sử dụng các công cụ allow-listed được cấp để tra cứu doanh thu, lịch sử đơn đặt tour và phân tích số liệu kinh doanh của chính đối tác."
)

ANALYTICS_RESPONSE_POLICY = (
    "\n\nNGUYÊN TẮC PHÂN TÍCH VÀ TRẢ LỜI SỐ LIỆU:"
    "\n1. Nhận xét xu hướng và sự thay đổi: Quan sát số liệu thực tế từ kết quả tool, hãy nhận xét rõ ràng xu hướng (tăng trưởng, sụt giảm, mức đỉnh, mức đáy, biến động đáng chú ý qua các mốc thời gian) để cung cấp góc nhìn nghiệp vụ hữu ích cho người quản lý."
    "\n2. Không lặp lại bảng số liệu thô bằng text: Biểu đồ (chart) đã thể hiện trực quan toàn bộ số liệu chi tiết. Do đó trong phần văn bản (text), KHÔNG vẽ lại bảng text và KHÔNG gạch đầu dòng liệt kê lại từng dòng số liệu chi tiết. Hãy tập trung vào tóm tắt tổng quan và phân tích nhận xét nghiệp vụ."
    "\n3. Không đưa disclaimer kỹ thuật nội bộ: Tuyệt đối không trích dẫn các câu chú thích kỹ thuật của hệ thống (như 'Source filters are applied...', 'The source does not provide confirmed status...'). Giữ câu trả lời tự nhiên, chuyên nghiệp và súc tích."
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
    user_role = getattr(context.user, "role", None)
    admin_session = is_admin_user(context.user)
    vendor_session = user_role == "vendor_admin"
    health_enabled = health_recommendation_enabled()
    if admin_session:
        base_prompt = ADMIN_BASE_PROMPT
    elif vendor_session:
        base_prompt = VENDOR_BASE_PROMPT
    elif health_enabled:
        base_prompt = SYSTEM_PROMPT + health_policy_prompt()
    else:
        base_prompt = SYSTEM_PROMPT

    system_prompt = (
        base_prompt
        + TOUR_CARD_RESPONSE_POLICY
        + ANALYTICS_RESPONSE_POLICY
        + CHART_RESPONSE_SCHEMA_INSTRUCTION
    )
    # Method 2 only: indicator-only health context (never identifying data).
    if health_enabled and not admin_session and not vendor_session and health_method() == "ai_filter":
        system_prompt += _build_health_context_prompt(context)
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
            parts, answer = parse_and_validate_response(turn.content)
            trace.append(_timing(started))
            return {
                "answer": answer,
                "parts": parts,
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
            if call.name in TOUR_RESULT_TOOLS:
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


def health_policy_prompt() -> str:
    """Health guidance for the customer prompt, pointing at the active tool only."""
    tool_name = (
        "search_tours_by_ai_filter"
        if health_method() == "ai_filter"
        else "search_tours_by_health"
    )
    return HEALTH_RECOMMENDATION_POLICY.format(tool_name=tool_name)


def _build_health_context_prompt(context: ToolContext) -> str:
    """Indicator-only profile fragment for the AI-driven filter method.

    Never contains name, email, phone, raw date of birth, auth id or user id.
    """
    health = getattr(context, "health_profile", None)
    if health is None or not getattr(health, "is_complete", False):
        return ""
    from ..health import build_profile_prompt
    profile_str = build_profile_prompt(health)
    if not profile_str:
        return ""
    return (
        f"\n\n{profile_str}. "
        "Dựa vào chỉ số trên, khi người dùng hỏi tour phù hợp sức khỏe, "
        "hãy gọi tool search_tours_by_ai_filter với difficulties và max_distance_km phù hợp. "
        "Không tiết lộ thông tin định danh cá nhân (tên, email, ngày sinh) "
        "cũng như các chỉ số sức khỏe ở trên trong câu trả lời."
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
