from apps.flash_sales.services.flash_sale_service import FlashSaleService
from ..admin_security import PERMISSIONS
from ..core import ToolSpec
from .common import mutation_or_preview, require_object


def summary(args, context):
    return [FlashSaleService.get_admin_campaigns_overview()]


def review_item(args, context):
    require_object(args, ["item_id", "action"], {"item_id", "action", "approval_token"})
    return mutation_or_preview(
        "review_campaign_item", args, context,
        lambda: FlashSaleService.review_item(args["item_id"], args["action"]),
    )


ADMIN_TOOL_SPECS = [
    ToolSpec("get_campaign_summary", "Read campaign overview through FlashSaleService.", {"type": "object", "properties": {}, "additionalProperties": False}, summary, permission=PERMISSIONS["report"], scope=PERMISSIONS["report"], allowed_roles=frozenset({"system_admin", "staff"})),
    ToolSpec("review_campaign_item", "Review a campaign item using the existing flash-sale workflow.", {"type": "object", "properties": {"item_id": {"type": "integer"}, "action": {"type": "string"}, "approval_token": {"type": "string"}}, "required": ["item_id", "action"], "additionalProperties": False}, review_item, read_only=False, destructive=True, permission=PERMISSIONS["campaign_update"], scope=PERMISSIONS["campaign_update"], allowed_roles=frozenset({"system_admin", "staff"})),
]
