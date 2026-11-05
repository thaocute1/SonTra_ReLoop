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


def registry_for_context(context: ToolContext) -> ToolRegistry:
    analytics_enabled = os.getenv("AI_ANALYTICS_TOOLS_ENABLED", "true").lower() not in {"0", "false", "off"}
    if getattr(context.user, "role", None) == "vendor_admin":
        tools = VENDOR_ANALYTICS_REGISTRY.specs() if analytics_enabled else []
        return ToolRegistry([*tools, *PUBLIC_TOOL_REGISTRY.specs()])
    if getattr(context.user, "role", None) in {"system_admin", "staff"}:
        filtered = ADMIN_TOOL_REGISTRY.filtered(lambda spec: has_permission(context.user, spec.permission))
        if not analytics_enabled:
            filtered = filtered.filtered(lambda spec: spec.name != "get_revenue_report")
        return ToolRegistry([*filtered.specs(), *PUBLIC_TOOL_REGISTRY.specs()])
    return PUBLIC_TOOL_REGISTRY


def execute_tool(tool_name, arguments, context=None):
    context = context or ToolContext(user=None, request_id="legacy-test-context")
    return ToolDispatcher(registry_for_context(context)).dispatch(tool_name, arguments, context)


TOOL_REGISTRY = PUBLIC_TOOL_REGISTRY
TOOL_DEFINITIONS = TOOL_REGISTRY.provider_definitions()
