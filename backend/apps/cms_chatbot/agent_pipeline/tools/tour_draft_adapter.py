"""Vendor tour-draft tool: read-only suggestion, no DB write."""

from .. import tour_draft
from ..core import ToolSpec


def suggest_tour_draft(args, context):
    """Return a core-field draft for the vendor create-tour form.

    Read-only: never imports TourService and never touches the database.
    The vendor reviews/edits the pre-filled form and submits it through the
    existing POST /api/v1/vendors/tours/ flow.
    """
    payload = tour_draft.normalize_draft_args(args)
    return [{"tool": "suggest_tour_draft", "draft": payload}]


VENDOR_TOUR_DRAFT_SPECS = [
    ToolSpec(
        name="suggest_tour_draft",
        description=(
            "Propose a draft of core fields for a new trekking experience, to pre-fill the "
            "vendor's create-tour form (title, description, difficulty_level, duration_hours, "
            "price, max_capacity, cover_image_url). Never invent route/checkpoints/schedules. "
            "This does NOT create anything; the vendor submits the form afterwards. Read-only."
        ),
        parameters={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Tour title (required)."},
                "description": {"type": "string"},
                "difficulty_level": {
                    "type": "string",
                    "enum": ["easy", "moderate", "challenging"],
                },
                "duration_hours": {"type": "number", "minimum": 0.1},
                "price": {"type": "number", "minimum": 1000},
                "max_capacity": {"type": "integer", "minimum": 1, "maximum": 100},
                "cover_image_url": {"type": "string"},
            },
            "required": ["title"],
            "additionalProperties": False,
        },
        handler=suggest_tour_draft,
        read_only=True,
        scope="tour.draft.suggest",
        allowed_roles=frozenset({"vendor_admin"}),
        max_results=1,
        max_input_length=2000,
    ),
]
