"""Admin policy, authorization and short-lived approval in one security boundary."""
import base64, hashlib, hmac, json, time
from django.conf import settings
from .core import AgentPipelineError, ToolSpec

ADMIN_ROLES = {"system_admin", "staff"}
DB_ROLES = {"customer", "vendor_admin", "guide", "system_admin", "staff"}
PERMISSIONS = {"report":"admin.report.read", "vendor_update":"vendor.admin.update", "campaign_update":"campaign.admin.update", "community_moderate":"community.admin.moderate"}

def _permissions(user):
    if getattr(user, "role", None) == "system_admin": return {"*"}
    try: staff = user.staffs
    except Exception: staff = None
    if not staff or not staff.is_active: return set()
    return {str(item) for item in (staff.permissions or [])} if isinstance(staff.permissions, (list, tuple, set)) else set()

def is_admin_user(user): return bool(getattr(user, "is_authenticated", False) and getattr(user, "role", None) in ADMIN_ROLES)
def has_permission(user, permission): return is_admin_user(user) and ("*" in _permissions(user) or permission in _permissions(user))
def authorize_spec(spec: ToolSpec, context):
    role = getattr(context.user, "role", None)
    if role not in DB_ROLES or (spec.allowed_roles and role not in spec.allowed_roles):
        raise AgentPipelineError("FORBIDDEN", "This tool is not available for your role.", 403)
    if spec.permission and not has_permission(context.user, spec.permission):
        raise AgentPipelineError("FORBIDDEN", "You are not allowed to use this tool.", 403)

def _payload(tool, arguments, user_id, request_id):
    clean = {k:v for k,v in arguments.items() if k != "approval_token"}; raw = json.dumps({"tool":tool,"arguments":clean,"user":user_id,"request":request_id}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()

def create_approval(tool, arguments, context, ttl=300):
    body = {"exp": int(time.time()) + ttl, "hash": _payload(tool, arguments, getattr(context.user, "id", None), context.request_id)}
    encoded = base64.urlsafe_b64encode(json.dumps(body, separators=(",", ":")).encode()).decode(); key = str(getattr(settings, "SECRET_KEY", "admin-agent")).encode()
    return encoded + "." + hmac.new(key, encoded.encode(), hashlib.sha256).hexdigest()

def require_approval(tool, arguments, context):
    token = arguments.get("approval_token")
    if not token: raise AgentPipelineError("CONFIRMATION_REQUIRED", "Confirmation is required before this change.", 409)
    try:
        encoded, signature = token.rsplit(".", 1); key = str(getattr(settings, "SECRET_KEY", "admin-agent")).encode()
        if not hmac.compare_digest(signature, hmac.new(key, encoded.encode(), hashlib.sha256).hexdigest()): raise ValueError
        body = json.loads(base64.urlsafe_b64decode(encoded.encode()))
        if int(body["exp"]) < int(time.time()): raise AgentPipelineError("APPROVAL_EXPIRED", "The approval has expired.", 409)
        if not hmac.compare_digest(body["hash"], _payload(tool, arguments, getattr(context.user, "id", None), context.request_id)): raise ValueError
    except AgentPipelineError: raise
    except Exception as exc: raise AgentPipelineError("INVALID_APPROVAL", "The approval does not match this request.", 409) from exc
