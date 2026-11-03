from django.urls import path

from .views import chat, history
from ..admin_views import approve, preview


app_name = "cms_chatbot_agent_pipeline"

urlpatterns = [
    path("agent/chat/", chat, name="agent-chat"),
    path("agent/history/", history, name="agent-history"),
    path("agent/admin/approve/", approve, name="agent-admin-approve"),
    path("agent/admin/preview/", preview, name="agent-admin-preview"),
]
