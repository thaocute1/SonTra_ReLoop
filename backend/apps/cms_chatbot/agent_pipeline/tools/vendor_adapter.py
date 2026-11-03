from apps.vendors.services.vendor_service import VendorService
from ..admin_security import PERMISSIONS
from ..core import ToolSpec
from .common import mutation_or_preview, require_object


def summary(args, context):
    return [VendorService.get_stats()]


def applications(args, context):
    require_object(args, [], {"status", "search"})
    rows = VendorService.get_applications(status=args.get("status"), search=args.get("search"))
    return [{"count": rows.count(), "vendor_ids": list(rows.values_list("id", flat=True)[:50])}]


def review_application(args, context):
    require_object(args, ["vendor_id", "status"], {"vendor_id", "status", "reason", "approval_token"})
    return mutation_or_preview(
        "review_vendor_application", args, context,
        lambda: _serialize(VendorService.review_application(args["vendor_id"], args["status"], args.get("reason"), context.user)),
    )


def _serialize(vendor):
    return {"id": vendor.id, "status": vendor.status}


ADMIN_TOOL_SPECS = [
    ToolSpec("get_vendor_summary", "Read vendor statistics through VendorService.", {"type": "object", "properties": {}, "additionalProperties": False}, summary, permission=PERMISSIONS["report"], scope=PERMISSIONS["report"], allowed_roles=frozenset({"system_admin", "staff"})),
    ToolSpec("get_vendor_applications", "Read vendor applications through VendorService.", {"type": "object", "properties": {"status": {"type": "string"}, "search": {"type": "string"}}, "additionalProperties": False}, applications, permission=PERMISSIONS["report"], scope=PERMISSIONS["report"], allowed_roles=frozenset({"system_admin", "staff"})),
    ToolSpec("review_vendor_application", "Review a vendor application using the existing vendor workflow.", {"type": "object", "properties": {"vendor_id": {"type": "integer"}, "status": {"type": "string"}, "reason": {"type": "string"}, "approval_token": {"type": "string"}}, "required": ["vendor_id", "status"], "additionalProperties": False}, review_application, read_only=False, destructive=True, permission=PERMISSIONS["vendor_update"], scope=PERMISSIONS["vendor_update"], allowed_roles=frozenset({"system_admin", "staff"})),
]
