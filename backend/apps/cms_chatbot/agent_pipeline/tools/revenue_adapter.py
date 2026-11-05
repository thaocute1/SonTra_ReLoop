"""Read-only revenue adapter over the existing admin report integration point."""
from ..admin_security import PERMISSIONS
from ..core import AgentPipelineError, ToolSpec
from .analytics_common import redact, rows_dataset, validate_report_args


def _source(args, context):
    # Kept as a narrow seam so the existing RevenueReportAdminView can be mocked
    # in tests without making the pipeline own payment/revenue business logic.
    from apps.payments.views.admin_payment_views import RevenueReportAdminView
    try:
        from types import SimpleNamespace
        response = RevenueReportAdminView().get(SimpleNamespace(query_params={}))
        return response.data if hasattr(response, "data") else response
    except Exception as exc:
        raise AgentPipelineError("SOURCE_UNAVAILABLE", "Revenue source is temporarily unavailable.", 503) from exc


def get_revenue_report(args, context):
    validate_report_args(args)
    data = redact(_source(args, context))
    rows = data.get("timeline_chart", []) if isinstance(data, dict) else []
    columns = [
        {"name": "label", "label": "Tháng", "type": "string"},
        {"name": "revenue", "label": "Doanh thu", "type": "number", "unit": "VND"},
        {"name": "bookings", "label": "Số booking", "type": "number", "unit": "booking"},
    ]
    return [{"data": rows_dataset("Admin revenue report. Currency unit: VND (VNĐ).", rows, columns)}]


SPEC = ToolSpec(
    "get_revenue_report", "Read the existing admin revenue report. Read-only.",
    {"type": "object", "properties": {"from": {"type": "string"}, "to": {"type": "string"}, "group_by": {"type": "string"}, "status": {"type": "string"}, "top_n": {"type": "integer", "minimum": 1, "maximum": 100}}, "additionalProperties": False},
    get_revenue_report, scope=PERMISSIONS["report"], permission=PERMISSIONS["report"], allowed_roles=frozenset({"system_admin", "staff"}), max_results=1,
)
