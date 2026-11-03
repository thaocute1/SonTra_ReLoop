from apps.cms_chatbot.services.community_service import CommunityService
from ..admin_security import PERMISSIONS
from ..core import ToolSpec
from .common import mutation_or_preview, require_object


def posts(args, context):
    require_object(args, [], {"status", "search"})
    return [CommunityService.get_admin_posts(status=args.get("status"), search=args.get("search"))]


def review_post(args, context):
    require_object(args, ["post_id", "action"], {"post_id", "action", "rejection_reason", "approval_token"})
    return mutation_or_preview(
        "review_community_post", args, context,
        lambda: CommunityService.review_post(args["post_id"], args["action"], args.get("rejection_reason", ""), context.user),
    )


def incidents(args, context):
    return CommunityService.get_incidents(user=context.user)


ADMIN_TOOL_SPECS = [
    ToolSpec("get_community_posts", "Read admin posts through CommunityService.", {"type": "object", "properties": {"status": {"type": "string"}, "search": {"type": "string"}}, "additionalProperties": False}, posts, permission=PERMISSIONS["report"], scope=PERMISSIONS["report"], allowed_roles=frozenset({"system_admin", "staff"})),
    ToolSpec("review_community_post", "Review a community post using the existing community workflow.", {"type": "object", "properties": {"post_id": {"type": "integer"}, "action": {"type": "string"}, "rejection_reason": {"type": "string"}, "approval_token": {"type": "string"}}, "required": ["post_id", "action"], "additionalProperties": False}, review_post, read_only=False, destructive=True, permission=PERMISSIONS["community_moderate"], scope=PERMISSIONS["community_moderate"], allowed_roles=frozenset({"system_admin", "staff"})),
    ToolSpec("get_incidents", "Read incidents through CommunityService.", {"type": "object", "properties": {}, "additionalProperties": False}, incidents, permission=PERMISSIONS["report"], scope=PERMISSIONS["report"], allowed_roles=frozenset({"system_admin", "staff"})),
]
