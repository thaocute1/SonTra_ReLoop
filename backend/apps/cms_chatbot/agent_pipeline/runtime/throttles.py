from rest_framework.throttling import SimpleRateThrottle


class AgentChatThrottle(SimpleRateThrottle):
    scope = "agent_chat"

    def get_cache_key(self, request, view):
        if getattr(request.user, "is_authenticated", False):
            identifier = str(getattr(request.user, "pk", None) or getattr(request.user, "id", "user"))
            return self.cache_format % {"scope": self.scope, "ident": f"user:{identifier}"}
        return self.cache_format % {"scope": self.scope, "ident": f"ip:{self.get_ident(request)}"}
