"""Tour-module tools and their permissions."""

import logging
import re
from typing import Any

from django.db import DatabaseError
from apps.tours.services.tour_service import TourService

from ..admin_security import PERMISSIONS
from ..core import AgentPipelineError, ToolContext, ToolSpec
from .common import require_object

MAX_TOUR_RESULTS = 5
MAX_QUERY_LENGTH = 200
ALLOWED_DIFFICULTIES = frozenset({"easy", "moderate", "challenging", "expert"})
REPORT = {"type": "object", "properties": {}, "additionalProperties": False}

# Health recommendation tools (plan: docs/health-based-tour-recommendation-plan.md)
MAX_DISTANCE_KM = 100.0
MAX_AI_DIFFICULTIES = 2
HEALTH_TOOL_NAMES = frozenset({"search_tours_by_health", "search_tours_by_ai_filter"})
logger = logging.getLogger(__name__)


def _string_or_none(value: Any) -> str | None:
    return None if value is None else str(value)


def _parse_filters(query: str, args: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    normalized = query.strip()
    filters: dict[str, Any] = {
        key: args[key]
        for key in ("min_duration_hours", "max_duration_hours", "min_price", "max_price", "min_rating", "difficulty_level")
        if key in args
    }

    hour_match = re.search(r"(?:dưới|tối đa|không quá|<=?)\s*(\d+(?:[.,]\d+)?)\s*giờ", normalized, re.IGNORECASE)
    if hour_match:
        filters.setdefault("max_duration_hours", float(hour_match.group(1).replace(",", ".")))
        normalized = normalized.replace(hour_match.group(0), "")
    if re.search(r"nửa\s*ngày", normalized, re.IGNORECASE):
        filters.setdefault("max_duration_hours", 6.0)
        normalized = re.sub(r"nửa\s*ngày", "", normalized, flags=re.IGNORECASE)
    if re.search(r"tour\s+ngắn|ngắn\s+ngày", normalized, re.IGNORECASE):
        filters.setdefault("max_duration_hours", 6.0)
        normalized = re.sub(r"tour\s+ngắn|ngắn\s+ngày", "", normalized, flags=re.IGNORECASE)

    price_match = re.search(r"(?:dưới|tối đa|không quá|<=?)\s*(\d+(?:[.,]\d+)?)\s*(k|nghìn|triệu|tr)?", normalized, re.IGNORECASE)
    if price_match and any(token in normalized.lower() for token in ("giá", "đồng", "vnd", "k", "nghìn", "triệu")):
        amount = float(price_match.group(1).replace(",", "."))
        unit = (price_match.group(2) or "").lower()
        multiplier = 1_000 if unit in {"k", "nghìn"} else 1_000_000 if unit == "triệu" else 1
        filters.setdefault("max_price", amount * multiplier)
        normalized = normalized.replace(price_match.group(0), "")

    difficulty_aliases = {
        "dễ": "easy", "de": "easy", "easy": "easy",
        "trung bình": "moderate", "moderate": "moderate",
        "thử thách": "challenging", "challenging": "challenging",
        "chuyên gia": "expert", "expert": "expert",
    }
    for label, value in difficulty_aliases.items():
        if re.search(rf"\b{re.escape(label)}\b", normalized, re.IGNORECASE):
            filters.setdefault("difficulty_level", value)
            normalized = re.sub(rf"\b{re.escape(label)}\b", "", normalized, flags=re.IGNORECASE)
            break

    normalized = re.sub(r"\btour\b", "", normalized, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", normalized).strip(" ,.-"), filters


def search_published_tours(query: str, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    filters = filters or {}
    search_query = query or None
    tours = TourService.get_published_tours(
        search=search_query,
        difficulty=filters.get("difficulty_level"),
    )
    tours = [
        tour for tour in tours
        if (filters.get("min_duration_hours") is None or float(tour.get("duration_hours") or 0) >= filters["min_duration_hours"])
        and (filters.get("max_duration_hours") is None or float(tour.get("duration_hours") or 0) <= filters["max_duration_hours"])
        and (filters.get("min_price") is None or float(tour.get("price") or 0) >= filters["min_price"])
        and (filters.get("max_price") is None or float(tour.get("price") or 0) <= filters["max_price"])
        and (filters.get("min_rating") is None or float(tour.get("avg_rating") or 0) >= filters["min_rating"])
    ]
    return [
        {
            "id": tour["id"],
            "title": tour["title"],
            "description": (tour["description"][:400] if tour.get("description") else None),
            "cover_image_url": tour.get("cover_image_url"),
            "price": _string_or_none(tour.get("price")),
            "difficulty_level": tour.get("difficulty_level"),
            "duration_hours": _string_or_none(tour.get("duration_hours")),
            "avg_rating": _string_or_none(tour.get("avg_rating")),
        }
        for tour in tours[:MAX_TOUR_RESULTS]
    ]


def search_tours(args: dict[str, Any], context: ToolContext) -> list[dict[str, Any]]:
    allowed = {"query", "min_duration_hours", "max_duration_hours", "min_price", "max_price", "min_rating", "difficulty_level"}
    if not isinstance(args, dict) or not set(args).issubset(allowed) or not isinstance(args.get("query"), str):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "search_tours requires a query string and valid filters.", 400)
    query = args["query"]
    if len(query) > MAX_QUERY_LENGTH:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "query is invalid or too long.", 400)
    for key in ("min_duration_hours", "max_duration_hours", "min_price", "max_price", "min_rating"):
        if key in args and (isinstance(args[key], bool) or not isinstance(args[key], (int, float)) or args[key] < 0):
            raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", f"{key} is invalid.", 400)
    if args.get("difficulty_level") not in (None, *ALLOWED_DIFFICULTIES):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "difficulty_level is invalid.", 400)
    try:
        search_query, filters = _parse_filters(query, args)
        return search_published_tours(search_query, filters) if filters else search_published_tours(search_query)
    except DatabaseError as error:
        raise AgentPipelineError("BACKEND_UNAVAILABLE", "The tour catalog is temporarily unavailable.", 503) from error


def _optional_health_query(args: dict[str, Any]) -> str:
    """Validate the optional free-text keyword shared by the health tools."""
    query = args.get("query", "") or ""
    if not isinstance(query, str):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "query must be a string.", 400)
    if len(query) > MAX_QUERY_LENGTH:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "query is invalid or too long.", 400)
    return query.strip()


def _order_by_difficulty_priority(
    results: list[dict[str, Any]], difficulties: list[str]
) -> list[dict[str, Any]]:
    """Keep the rule's difficulty priority (stable: rating order inside a level)."""
    order = {difficulty: index for index, difficulty in enumerate(difficulties)}
    return sorted(results, key=lambda tour: order.get(tour.get("difficulty_level"), len(order)))


def _health_difficulties(context: ToolContext) -> list[str]:
    """Difficulty list computed from the backend-owned health profile."""
    health = getattr(context, "health_profile", None)
    if health is None or not getattr(health, "is_complete", False):
        return []
    from ..health import recommend_difficulty
    return recommend_difficulty(health)


def _log_health_recommendation(
    tool_name: str,
    context: ToolContext,
    results: list[dict[str, Any]],
    difficulty_applied: bool,
) -> None:
    """Log counts and booleans only — never the health values themselves."""
    logger.info(
        "ai_health_recommendation_applied",
        extra={
            "tool_name": tool_name,
            "result_count": len(results),
            "has_health_profile": getattr(context, "health_profile", None) is not None,
            "difficulty_applied": difficulty_applied,
        },
    )


def search_tours_by_health(args: dict[str, Any], context: ToolContext) -> list[dict[str, Any]]:
    """Suggest published tours for the authenticated user's health profile.

    Method 1 (rule-based): the health profile never leaves the backend. The
    difficulty list is computed here from ``context.health_profile``; no health
    value is accepted from model arguments. Read-only.
    """
    allowed = {"query"}
    if not isinstance(args, dict) or not set(args).issubset(allowed):
        raise AgentPipelineError(
            "INVALID_TOOL_ARGUMENTS",
            "search_tours_by_health only accepts an optional query.",
            400,
        )
    query = _optional_health_query(args)
    difficulties = _health_difficulties(context)
    try:
        if difficulties:
            results = TourService.get_tours_by_difficulties(
                difficulties, search=query or None, limit=MAX_TOUR_RESULTS
            )
            if not results and query:
                # A narrow keyword must not hide the health recommendation.
                results = TourService.get_tours_by_difficulties(
                    difficulties, search=None, limit=MAX_TOUR_RESULTS
                )
        else:
            # Missing or incomplete profile: fall back to a normal catalog search.
            results = TourService.get_tours_by_health_filter(
                query=query or None, limit=MAX_TOUR_RESULTS
            )
    except DatabaseError as error:
        raise AgentPipelineError(
            "BACKEND_UNAVAILABLE", "The tour catalog is temporarily unavailable.", 503
        ) from error
    if difficulties:
        results = _order_by_difficulty_priority(results, difficulties)
    _log_health_recommendation("search_tours_by_health", context, results, bool(difficulties))
    return results


def search_tours_by_ai_filter(args: dict[str, Any], context: ToolContext) -> list[dict[str, Any]]:
    """Method 2: the model proposes result filters, the backend validates them.

    The model must not relay raw health data through tool arguments; it may
    only propose ``difficulties`` (max 2, enum) and ``max_distance_km``.
    Read-only.
    """
    allowed = {"query", "difficulties", "max_distance_km"}
    if not isinstance(args, dict) or not set(args).issubset(allowed):
        raise AgentPipelineError(
            "INVALID_TOOL_ARGUMENTS",
            "search_tours_by_ai_filter only accepts query, difficulties and max_distance_km.",
            400,
        )
    query = _optional_health_query(args)

    raw_difficulties = args.get("difficulties", [])
    if raw_difficulties is None:
        raw_difficulties = []
    if not isinstance(raw_difficulties, list):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "difficulties must be a list.", 400)
    difficulties: list[str] = []
    for value in raw_difficulties:
        if not isinstance(value, str) or value not in ALLOWED_DIFFICULTIES:
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "difficulties contains an invalid value.", 400
            )
        if value not in difficulties:
            difficulties.append(value)
    difficulties = difficulties[:MAX_AI_DIFFICULTIES]

    from ..health import BMI_SAFETY_THRESHOLD

    health = getattr(context, "health_profile", None)
    if (
        health is not None
        and getattr(health, "bmi", None) is not None
        and health.bmi >= BMI_SAFETY_THRESHOLD
    ):
        # Same safety override as the rule engine: the model may not raise the
        # difficulty of a user in the obesity class III range.
        difficulties = ["easy"]

    max_distance = args.get("max_distance_km")
    if max_distance is not None:
        if (
            isinstance(max_distance, bool)
            or not isinstance(max_distance, (int, float))
            or max_distance <= 0
        ):
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "max_distance_km is invalid.", 400
            )
        max_distance = min(float(max_distance), MAX_DISTANCE_KM)  # hard cap

    try:
        results = TourService.get_tours_by_health_filter(
            query=query or None,
            difficulties=difficulties or None,
            max_distance_km=max_distance,
            limit=MAX_TOUR_RESULTS,
        )
        if not results and query:
            results = TourService.get_tours_by_health_filter(
                query=None,
                difficulties=difficulties or None,
                max_distance_km=max_distance,
                limit=MAX_TOUR_RESULTS,
            )
    except DatabaseError as error:
        raise AgentPipelineError(
            "BACKEND_UNAVAILABLE", "The tour catalog is temporarily unavailable.", 503
        ) from error
    _log_health_recommendation(
        "search_tours_by_ai_filter",
        context,
        results,
        bool(difficulties or max_distance is not None),
    )
    return results


def search_admin_tours(args, context):
    require_object(args, ["query"], {"query"})
    tours = TourService.get_published_tours(search=args["query"])
    return [{"id": tour["id"], "title": tour["title"], "status": tour.get("status")} for tour in tours[:5]]


def published_summary(args, context):
    return [{"tours": TourService.get_published_tours(search=args.get("search"))}]


PUBLIC_TOOL_SPECS = [
    ToolSpec(
        name="search_tours",
        description="Search the published Son Tra tour catalog by keyword and filters such as duration, price, difficulty, or rating. Read-only.",
        parameters={"type": "object", "properties": {
            "query": {"type": "string"},
            "min_duration_hours": {"type": "number", "minimum": 0},
            "max_duration_hours": {"type": "number", "minimum": 0},
            "min_price": {"type": "number", "minimum": 0},
            "max_price": {"type": "number", "minimum": 0},
            "min_rating": {"type": "number", "minimum": 0, "maximum": 5},
            "difficulty_level": {"type": "string", "enum": sorted(ALLOWED_DIFFICULTIES)},
        }, "required": ["query"], "additionalProperties": False},
        handler=search_tours,
        read_only=True,
        scope="tour.catalog.read",
        max_results=MAX_TOUR_RESULTS,
        max_input_length=MAX_QUERY_LENGTH,
    ),
    ToolSpec(
        name="search_tours_by_health",
        description=(
            "Suggest Son Tra tours suited to the authenticated user's physical fitness. "
            "The backend computes the health profile; do NOT pass age, weight, height, BMI or "
            "fitness_level as arguments. Call this when the user asks for tours matching their "
            "fitness, health or physical condition. Read-only."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Optional keyword. Only pass it when the user names a specific place, "
                        "tour or activity; otherwise omit it."
                    ),
                },
            },
            "required": [],
            "additionalProperties": False,
        },
        handler=search_tours_by_health,
        read_only=True,
        scope="tour.catalog.read",
        max_results=MAX_TOUR_RESULTS,
        max_input_length=MAX_QUERY_LENGTH,
    ),
    ToolSpec(
        name="search_tours_by_ai_filter",
        description=(
            "Search published Son Tra tours using result filters derived from the user's fitness "
            "context supplied in the system prompt. Pass difficulty levels from the allowed enum "
            "and an optional maximum route distance in km. Do NOT pass raw health data "
            "(age, weight, height, BMI) as arguments. Read-only."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Optional keyword. Only pass it when the user names a specific place, "
                        "tour or activity; otherwise omit it."
                    ),
                },
                "difficulties": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": sorted(ALLOWED_DIFFICULTIES),
                    },
                    "maxItems": MAX_AI_DIFFICULTIES,
                    "description": "Difficulty levels to include (max 2).",
                },
                "max_distance_km": {
                    "type": "number",
                    "minimum": 0.1,
                    "maximum": MAX_DISTANCE_KM,
                    "description": "Maximum route distance in km.",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
        handler=search_tours_by_ai_filter,
        read_only=True,
        scope="tour.catalog.read",
        max_results=MAX_TOUR_RESULTS,
        max_input_length=MAX_QUERY_LENGTH,
    ),
]

ADMIN_TOOL_SPECS = [
    ToolSpec(
        name="search_published_tours",
        description="Search published tours through the existing tour service.",
        parameters={"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"], "additionalProperties": False},
        handler=search_admin_tours,
        permission=PERMISSIONS["report"],
        scope=PERMISSIONS["report"],
        allowed_roles=frozenset({"system_admin", "staff"}),
    ),
    ToolSpec(
        name="get_tour_summary",
        description="Read the existing published tour service projection.",
        parameters=REPORT,
        handler=published_summary,
        permission=PERMISSIONS["report"],
        scope=PERMISSIONS["report"],
        allowed_roles=frozenset({"system_admin", "staff"}),
    ),
]
