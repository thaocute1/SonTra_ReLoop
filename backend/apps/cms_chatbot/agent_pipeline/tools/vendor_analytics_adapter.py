"""Vendor-scoped read adapters. Scope always comes from ToolContext."""
from ..core import AgentPipelineError, ToolSpec
from .analytics_common import redact, rows_dataset, validate_report_args
from .customer_analytics import customer_segments
from .recommendations import business_recommendations


def _vendor_id(context):
    if getattr(context.user, "role", None) != "vendor_admin" or not context.vendor_id:
        raise AgentPipelineError("DATA_ACCESS_DENIED", "A vendor ownership scope is required.", 403)
    return context.vendor_id


def _dashboard(args, context):
    from apps.vendors.services.vendor_service import VendorService
    return VendorService.get_vendor_dashboard(_vendor_id(context))


def get_vendor_revenue_report(args, context):
    validate_report_args(args)
    data = redact(_dashboard(args, context))
    chart = data.get("revenue_chart", {}).get("data", []) if isinstance(data, dict) else []
    return [{"data": rows_dataset("Vendor revenue report", chart, source="vendor_dashboard"), "scope": "own_vendor"}]


def get_vendor_booking_history(args, context):
    allowed = {"status", "search", "date", "top_n"}
    if not isinstance(args, dict) or set(args) - allowed:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "Invalid booking arguments.", 400)
    if "top_n" in args and (not isinstance(args["top_n"], int) or not 1 <= args["top_n"] <= 100):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "top_n must be between 1 and 100.", 400)
    from apps.vendors.services.vendor_service import VendorService
    data = VendorService.get_vendor_bookings(_vendor_id(context), args.get("status"), args.get("search"), args.get("date"))
    rows = data.get("bookings", data.get("results", [])) if isinstance(data, dict) else data
    safe = []
    for row in (rows or [])[:args.get("top_n", 50)]:
        row = redact(row)
        safe.append({k: row.get(k) for k in ("order_code", "experience_name", "booking_date", "time_slot", "total_price", "status", "payment_status", "is_flash_sale") if k in row})
    return [{"data": rows_dataset("Vendor booking history (aggregated and redacted)", safe, source="vendor_bookings"), "scope": "own_vendor"}]


def _safe_booking_rows(context):
    from apps.vendors.services.vendor_service import VendorService
    data = VendorService.get_vendor_bookings(_vendor_id(context))
    rows = data.get("bookings", data.get("results", [])) if isinstance(data, dict) else data
    return [{k: row.get(k) for k in ("total_price", "status", "is_flash_sale", "experience_name", "booking_date") if k in row} for row in (rows or [])]


def get_vendor_customer_segments(args, context):
    if args:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "This projection does not accept arguments.", 400)
    return [{"data": customer_segments(_safe_booking_rows(context)), "scope": "own_vendor"}]


def get_vendor_business_recommendations(args, context):
    if args:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "This projection does not accept arguments.", 400)
    projection = customer_segments(_safe_booking_rows(context))
    return [{"data": business_recommendations(projection), "scope": "own_vendor"}]


VENDOR_TOOL_SPECS = [
    ToolSpec("get_vendor_revenue_report", "Read revenue for the authenticated vendor only.", {"type": "object", "properties": {"from": {"type": "string"}, "to": {"type": "string"}, "group_by": {"type": "string"}, "status": {"type": "string"}, "top_n": {"type": "integer"}}, "additionalProperties": False}, get_vendor_revenue_report, scope="vendor.analytics.read", allowed_roles=frozenset({"vendor_admin"}), max_results=1),
    ToolSpec("get_vendor_booking_history", "Read redacted booking history for the authenticated vendor only.", {"type": "object", "properties": {"status": {"type": "string"}, "search": {"type": "string"}, "date": {"type": "string"}, "top_n": {"type": "integer"}}, "additionalProperties": False}, get_vendor_booking_history, scope="vendor.analytics.read", allowed_roles=frozenset({"vendor_admin"}), max_results=1),
    ToolSpec("get_vendor_customer_segments", "Read privacy-preserving customer segments for the authenticated vendor.", {"type": "object", "properties": {}, "additionalProperties": False}, get_vendor_customer_segments, scope="vendor.analytics.read", allowed_roles=frozenset({"vendor_admin"}), max_results=1),
    ToolSpec("get_vendor_business_recommendations", "Read deterministic, evidence-backed business recommendations for the authenticated vendor.", {"type": "object", "properties": {}, "additionalProperties": False}, get_vendor_business_recommendations, scope="vendor.analytics.read", allowed_roles=frozenset({"vendor_admin"}), max_results=1),
]
