"""Pure helpers for the vendor tour-draft tool (mirrors health.py).

Read-only: no database access, no side effects. The tool only proposes the
core fields; the actual tour creation still goes through the existing
VendorTourListView POST form flow.
"""

from .core import AgentPipelineError

# Khớp TourCreateSerializer.difficulty_level (easy | moderate | challenging).
DRAFT_DIFFICULTIES = frozenset({"easy", "moderate", "challenging"})

CORE_FIELDS = {
    "title",
    "description",
    "difficulty_level",
    "duration_hours",
    "price",
    "max_capacity",
    "cover_image_url",
}

TITLE_MAX = 255
DESCRIPTION_MAX = 2000
URL_MAX = 2000
MIN_PRICE = 1000
MAX_CAPACITY = 100


def normalize_draft_args(args: dict) -> dict:
    """Validate + sanitize the model-proposed core fields.

    Returns only the fields that were provided and valid; missing fields are
    left out so the existing create form keeps its own defaults. Never writes
    to the database.
    """
    if not isinstance(args, dict):
        raise AgentPipelineError(
            "INVALID_TOOL_ARGUMENTS", "Tool arguments must be an object.", 400
        )

    unknown = set(args) - CORE_FIELDS
    if unknown:
        raise AgentPipelineError(
            "INVALID_TOOL_ARGUMENTS",
            "suggest_tour_draft chỉ nhận các trường: " + ", ".join(sorted(CORE_FIELDS)) + ".",
            400,
        )

    result: dict = {}

    if "title" in args:
        title = str(args["title"] or "").strip()
        if not title:
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "title không được để trống.", 400
            )
        if len(title) > TITLE_MAX:
            raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "title quá dài.", 400)
        result["title"] = title

    if "description" in args and args["description"] is not None:
        description = str(args["description"]).strip()
        if len(description) > DESCRIPTION_MAX:
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "description quá dài.", 400
            )
        result["description"] = description

    if "difficulty_level" in args and args["difficulty_level"] is not None:
        difficulty = args["difficulty_level"]
        if difficulty not in DRAFT_DIFFICULTIES:
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS",
                "difficulty_level phải là easy | moderate | challenging.",
                400,
            )
        result["difficulty_level"] = difficulty

    if "duration_hours" in args and args["duration_hours"] is not None:
        duration = args["duration_hours"]
        if (
            isinstance(duration, bool)
            or not isinstance(duration, (int, float))
            or duration <= 0
        ):
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "duration_hours không hợp lệ.", 400
            )
        result["duration_hours"] = float(duration)

    if "price" in args and args["price"] is not None:
        price = args["price"]
        if (
            isinstance(price, bool)
            or not isinstance(price, (int, float))
            or price < MIN_PRICE
        ):
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "price phải >= 1000.", 400
            )
        result["price"] = int(price)

    if "max_capacity" in args and args["max_capacity"] is not None:
        capacity = args["max_capacity"]
        if (
            isinstance(capacity, bool)
            or not isinstance(capacity, int)
            or not 1 <= capacity <= MAX_CAPACITY
        ):
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "max_capacity phải từ 1 đến 100.", 400
            )
        result["max_capacity"] = capacity

    if "cover_image_url" in args and args["cover_image_url"] is not None:
        cover = str(args["cover_image_url"]).strip()
        if len(cover) > URL_MAX:
            raise AgentPipelineError(
                "INVALID_TOOL_ARGUMENTS", "cover_image_url quá dài.", 400
            )
        result["cover_image_url"] = cover

    return result
