import json
import logging
from typing import Any

from django.db import DatabaseError
from django.db.models import Count, Max, Min

from apps.cms_chatbot.models import ChatHistories


logger = logging.getLogger(__name__)


def save_chat_turn(
    user: Any,
    session_id: str,
    user_message: str,
    answer: str,
    blocks: list[dict],
    parts: list[dict] | None = None,
) -> None:
    """Persist one authenticated chat turn without exposing another user's data."""
    user_id = getattr(user, "id", None)
    if not user_id:
        return
    try:
        ChatHistories.objects.create(
            user_id=user_id,
            session_id=session_id,
            user_message=user_message,
            bot_response=json.dumps(
                {"answer": answer, "blocks": blocks, "parts": parts or []},
                ensure_ascii=False,
            ),
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
        
        parts = response.get("parts")
        if not parts:
            parts = [{"type": "text", "text": response.get("answer", "")}] if response.get("answer") else []

        messages.append({
            "id": f"history-assistant-{history.id}",
            "role": "assistant",
            "content": response.get("answer", ""),
            "parts": parts,
            "blocks": response.get("blocks", []),
            "timestamp": history.created_at.isoformat() if history.created_at else None,
        })
    return messages


def load_chat_sessions(user: Any, limit: int = 50) -> list[dict[str, Any]]:
    """List an authenticated user's chat sessions, newest first.

    Reuses the existing chat_histories rows (no new table / migration): each
    session is grouped by session_id, titled by its first user message.
    """
    try:
        safe_limit = max(1, min(int(limit), 100))
    except (TypeError, ValueError):
        safe_limit = 50

    rows = list(
        ChatHistories.objects.filter(user=user)
        .values("session_id")
        .annotate(
            first_id=Min("id"),
            last_at=Max("created_at"),
            turn_count=Count("id"),
        )
        .order_by("-last_at")[:safe_limit]
    )
    if not rows:
        return []

    first_ids = [row["first_id"] for row in rows if row.get("first_id") is not None]
    first_messages = {
        history.id: history.user_message
        for history in ChatHistories.objects.filter(id__in=first_ids).only("id", "user_message")
    }

    sessions = []
    for row in rows:
        raw_title = (first_messages.get(row.get("first_id")) or "").strip()
        title = " ".join(raw_title.split())
        if len(title) > 80:
            title = title[:77].rstrip() + "..."
        sessions.append({
            "session_id": row.get("session_id"),
            "title": title or "Cuộc hội thoại",
            "last_message_at": row["last_at"].isoformat() if row.get("last_at") else None,
            "turn_count": int(row.get("turn_count") or 0),
        })
    return sessions
