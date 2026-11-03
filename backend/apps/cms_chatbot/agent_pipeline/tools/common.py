from ..admin_security import require_approval
from ..core import AgentPipelineError


def require_object(args, required, allowed):
    if not isinstance(args, dict) or set(args) - set(allowed) or any(key not in args for key in required):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "Invalid tool arguments.", 400)


def mutation_or_preview(name, args, context, execute):
    if not args.get("approval_token"):
        return [{"confirmation_required": True, "tool": name}]
    require_approval(name, args, context)
    try:
        result = execute()
    except (ValueError, TypeError) as exc:
        raise AgentPipelineError("INVALID_MUTATION", str(exc), 400) from exc
    if result is None:
        raise AgentPipelineError("RESOURCE_NOT_FOUND", "Resource was not found.", 404)
    return [result if isinstance(result, dict) else {"data": result}]
