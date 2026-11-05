from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .admin_security import is_admin_user, create_approval
from .tools.catalog import ADMIN_TOOL_DISPATCHER, ADMIN_TOOL_REGISTRY
from .core import AgentPipelineError, ToolContext


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve(request):
    """Execute an already previewed mutation after explicit frontend confirmation."""
    if not is_admin_user(request.user):
        return Response({"ok": False, "error": {"code": "FORBIDDEN", "message": "Admin access is required."}}, status=403)
    data = request.data if isinstance(request.data, dict) else {}
    tool, arguments = data.get("tool"), data.get("arguments")
    if not isinstance(tool, str) or not isinstance(arguments, dict):
        return Response({"ok": False, "error": {"code": "INVALID_TOOL_ARGUMENTS", "message": "tool and arguments are required."}}, status=400)
    try:
        request_id = request.headers.get("X-Request-ID", "admin-approval")
        result = ADMIN_TOOL_DISPATCHER.dispatch(tool, arguments, ToolContext(request.user, request_id))
        return Response({"ok": True, "data": result}, status=status.HTTP_200_OK)
    except AgentPipelineError as error:
        return Response({"ok": False, "error": {"code": error.code, "message": error.message}}, status=error.http_status)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def preview(request):
    """Create a short-lived approval token for the explicit confirmation UI."""
    if not is_admin_user(request.user):
        return Response({"ok": False, "error": {"code": "FORBIDDEN", "message": "Admin access is required."}}, status=403)
    data = request.data if isinstance(request.data, dict) else {}
    tool, arguments = data.get("tool"), data.get("arguments")
    if not isinstance(tool, str) or not isinstance(arguments, dict):
        return Response({"ok": False, "error": {"code": "INVALID_TOOL_ARGUMENTS", "message": "tool and arguments are required."}}, status=400)
    try:
        spec = ADMIN_TOOL_REGISTRY.get(tool)
        if spec.read_only:
            raise AgentPipelineError("INVALID_MUTATION", "Only mutation tools can be previewed.", 400)
        context = ToolContext(request.user, request.headers.get("X-Request-ID", "admin-preview"))
        # Dispatch validates the allow-list and resource arguments without mutating.
        result = ADMIN_TOOL_DISPATCHER.dispatch(tool, arguments, context)
        token = create_approval(tool, arguments, context)
        return Response({"ok": True, "preview": result, "approval_token": token}, status=200)
    except AgentPipelineError as error:
        return Response({"ok": False, "error": {"code": error.code, "message": error.message}}, status=error.http_status)
