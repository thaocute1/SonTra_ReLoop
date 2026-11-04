from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.challenge_views import PublicMissionListView, MissionCompleteView

app_name = 'challenging'
router = DefaultRouter()

urlpatterns = [
    path('missions/', PublicMissionListView.as_view(), name='mission-list'),
    path('missions/<int:pk>/complete/', MissionCompleteView.as_view(), name='mission-complete'),
    path('', include(router.urls)),
]
