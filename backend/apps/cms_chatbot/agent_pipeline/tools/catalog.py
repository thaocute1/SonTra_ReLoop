"""Registry assembly; business tools remain defined in their module adapters."""

from ..admin_security import has_permission
from ..core import ToolContext, ToolDispatcher, ToolRegistry
from . import campaign_adapter, community_adapter, tour_adapter, vendor_adapter

PUBLIC_TOOL_REGISTRY = ToolRegistry(tour_adapter.PUBLIC_TOOL_SPECS)
ADMIN_TOOL_SPECS = [
    *tour_adapter.ADMIN_TOOL_SPECS,
    *vendor_adapter.ADMIN_TOOL_SPECS,
    *campaign_adapter.ADMIN_TOOL_SPECS,
    *community_adapter.ADMIN_TOOL_SPECS,
]
ADMIN_TOOL_REGISTRY = ToolRegistry(ADMIN_TOOL_SPECS)
ADMIN_TOOL_DISPATCHER = ToolDispatcher(ADMIN_TOOL_REGISTRY)


def registry_for_context(context: ToolContext) -> ToolRegistry:
    if getattr(context.user, "role", None) in {"system_admin", "staff"}:
        filtered = ADMIN_TOOL_REGISTRY.filtered(lambda spec: has_permission(context.user, spec.permission))
        return ToolRegistry([*filtered.specs(), *PUBLIC_TOOL_REGISTRY.specs()])
    return PUBLIC_TOOL_REGISTRY


def execute_tool(tool_name, arguments, context=None):
    context = context or ToolContext(user=None, request_id="legacy-test-context")
    return ToolDispatcher(registry_for_context(context)).dispatch(tool_name, arguments, context)


TOOL_REGISTRY = PUBLIC_TOOL_REGISTRY
TOOL_DEFINITIONS = TOOL_REGISTRY.provider_definitions()
