"""Tour-module tools and their permissions."""

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
    )
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
