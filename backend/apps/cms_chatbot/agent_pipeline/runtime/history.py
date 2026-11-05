import json
import logging
from typing import Any

from django.db import DatabaseError

from apps.cms_chatbot.models import ChatHistories


logger = logging.getLogger(__name__)


def save_chat_turn(user: Any, session_id: str, user_message: str, answer: str, blocks: list[dict]) -> None:
    """Persist one authenticated chat turn without exposing another user's data."""
    user_id = getattr(user, "id", None)
    if not user_id:
        return
    try:
        ChatHistories.objects.create(
            user_id=user_id,
            session_id=session_id,
            user_message=user_message,
            bot_response=json.dumps({"answer": answer, "blocks": blocks}, ensure_ascii=False),
        )
    except DatabaseError:
        logger.warning("ai_agent_chat_history_save_failed", exc_info=True)


def load_chat_history(user: Any, session_id: str) -> list[dict[str, Any]]:
    messages = []
    for history in ChatHistories.objects.filter(user=user, session_id=session_id).order_by("created_at", "id"):
        messages.append({
            "id": f"history-user-{history.id}",
            "role": "user",
            "content": history.user_message,
            "timestamp": history.created_at.isoformat() if history.created_at else None,
        })
        try:
            response = json.loads(history.bot_response)
        except (TypeError, ValueError):
            response = {"answer": history.bot_response, "blocks": []}
        messages.append({
            "id": f"history-assistant-{history.id}",
            "role": "assistant",
            "content": response.get("answer", ""),
            "blocks": response.get("blocks", []),
            "timestamp": history.created_at.isoformat() if history.created_at else None,
        })
    return messages
