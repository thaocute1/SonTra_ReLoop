"""Registry assembly; business tools remain defined in their module adapters."""
import os

from ..admin_security import has_permission
from ..core import ToolContext, ToolDispatcher, ToolRegistry
from . import campaign_adapter, community_adapter, tour_adapter, vendor_adapter, revenue_adapter, vendor_analytics_adapter

PUBLIC_TOOL_REGISTRY = ToolRegistry(tour_adapter.PUBLIC_TOOL_SPECS)
ADMIN_TOOL_SPECS = [
    *tour_adapter.ADMIN_TOOL_SPECS,
    *vendor_adapter.ADMIN_TOOL_SPECS,
    *campaign_adapter.ADMIN_TOOL_SPECS,
    *community_adapter.ADMIN_TOOL_SPECS,
    revenue_adapter.SPEC,
]
VENDOR_ANALYTICS_REGISTRY = ToolRegistry(vendor_analytics_adapter.VENDOR_TOOL_SPECS)
ADMIN_TOOL_REGISTRY = ToolRegistry(ADMIN_TOOL_SPECS)
ADMIN_TOOL_DISPATCHER = ToolDispatcher(ADMIN_TOOL_REGISTRY)

HEALTH_METHODS = frozenset({"rule", "ai_filter"})
HEALTH_TOOL_NAMES = tour_adapter.HEALTH_TOOL_NAMES


def health_recommendation_enabled() -> bool:
    """Feature switch: AI_HEALTH_RECOMMENDATION_ENABLED=false disables both tools."""
    return os.getenv("AI_HEALTH_RECOMMENDATION_ENABLED", "true").strip().lower() not in {
        "0",
        "false",
        "off",
        "no",
    }


def health_method() -> str:
    """Active method: ``rule`` (default) or ``ai_filter``. Unknown values fall back to rule."""
    method = os.getenv("AI_HEALTH_METHOD", "rule").strip().lower()
    return method if method in HEALTH_METHODS else "rule"


def public_tool_specs() -> list:
    """Public allowlist with exactly one health tool active, or none when disabled."""
    if not health_recommendation_enabled():
        active = None
    else:
        active = (
            "search_tours_by_ai_filter" if health_method() == "ai_filter"
            else "search_tours_by_health"
        )
    return [
        spec
        for spec in tour_adapter.PUBLIC_TOOL_SPECS
        if spec.name not in HEALTH_TOOL_NAMES or spec.name == active
    ]


def registry_for_context(context: ToolContext) -> ToolRegistry:
    analytics_enabled = os.getenv("AI_ANALYTICS_TOOLS_ENABLED", "true").lower() not in {"0", "false", "off"}
    public_specs = public_tool_specs()
    if getattr(context.user, "role", None) == "vendor_admin":
        tools = VENDOR_ANALYTICS_REGISTRY.specs() if analytics_enabled else []
        return ToolRegistry([*tools, *public_specs])
    if getattr(context.user, "role", None) in {"system_admin", "staff"}:
        filtered = ADMIN_TOOL_REGISTRY.filtered(lambda spec: has_permission(context.user, spec.permission))
        if not analytics_enabled:
            filtered = filtered.filtered(lambda spec: spec.name != "get_revenue_report")
        return ToolRegistry([*filtered.specs(), *public_specs])
    return ToolRegistry(public_specs)


def execute_tool(tool_name, arguments, context=None):
    context = context or ToolContext(user=None, request_id="legacy-test-context")
    return ToolDispatcher(registry_for_context(context)).dispatch(tool_name, arguments, context)


TOOL_REGISTRY = PUBLIC_TOOL_REGISTRY
TOOL_DEFINITIONS = TOOL_REGISTRY.provider_definitions()
