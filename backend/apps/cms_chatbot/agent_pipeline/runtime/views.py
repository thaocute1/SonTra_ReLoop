import logging
import re
import uuid
from datetime import datetime, timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .agent import run_agent_loop
from ..core import AgentPipelineError, ToolContext
from .providers import get_provider
from .serializers import AgentChatRequestSerializer
from .throttles import AgentChatThrottle
from .history import load_chat_history, save_chat_turn


logger = logging.getLogger(__name__)
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([AgentChatThrottle])
def chat(request):
    serializer = AgentChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "ok": False,
                "session_id": (
                    request.data.get("session_id", "")
                    if isinstance(request.data, dict)
                    else ""
                ),
                "answer": "",
                "trace": [],
                "status": "ERROR",
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Chat request validation failed.",
                    "details": serializer.errors,
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    values = serializer.validated_data
    provider_name = "deepseek"
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    provider = None
    try:
        provider = get_provider()
        result = run_agent_loop(
            _message_with_dataset(values),
            provider,
            values["max_loops"],
            context=ToolContext.from_request(request, request_id),
        )
    except AgentPipelineError as error:
        logger.warning(
            "ai_agent_chat_failed",
            extra={
                "provider": provider_name,
                "model": getattr(provider, "model", ""),
                "request_id": request_id,
                "error_code": error.code,
            },
        )
        return Response(
            {
                "ok": False,
                "session_id": values["session_id"],
                "answer": "",
                "trace": [],
                "status": "ERROR",
                "error": {"code": error.code, "message": error.message},
            },
            status=error.http_status,
        )

    logger.info(
        "ai_agent_chat_completed",
        extra={
            "provider": provider_name,
            "model": getattr(provider, "model", ""),
            "request_id": request_id,
            "duration_ms": result["trace"][-1]["duration_ms"],
            "backend_status": "ok",
            "final_response_status": "success",
            "fallback": False,
        },
    )
    parts = result.get("parts") or [{"type": "text", "text": result["answer"]}]
    save_chat_turn(
        request.user,
        values["session_id"],
        values["message"],
        result["answer"],
        result.get("blocks", []),
        parts,
    )
    return Response(
        {
            "ok": True,
            "session_id": values["session_id"],
            "conversation_id": values.get("conversation_id") or values["session_id"],
            "answer": result["answer"],
            "message": {
                "id": f"msg_{uuid.uuid4().hex}",
                "role": "assistant",
                "parts": parts,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            "usage": None,
            "blocks": result.get("blocks", []),
            "trace": result["trace"],
            "status": "OK",
            "error": None,
        },
        status=status.HTTP_200_OK,
    )


def _message_with_dataset(values):
    dataset = values.get("data")
    if not dataset:
        return values["message"]
    import json
    return values["message"] + "\nProvided dataset:\n" + json.dumps(dataset, ensure_ascii=False, separators=(",", ":"))[:32000]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def history(request):
    session_id = request.query_params.get("session_id", "")
    if not SESSION_ID_PATTERN.fullmatch(session_id):
        return Response(
            {"ok": False, "error": {"code": "INVALID_REQUEST", "message": "session_id is invalid."}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {"ok": True, "session_id": session_id, "messages": load_chat_history(request.user, session_id)},
        status=status.HTTP_200_OK,
    )
