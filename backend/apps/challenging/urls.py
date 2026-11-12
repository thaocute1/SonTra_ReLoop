from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.challenge_views import PublicMissionListView, MissionCompleteView, MissionReviewQueueView, MissionReviewView

app_name = 'challenging'
router = DefaultRouter()

urlpatterns = [
    path('missions/', PublicMissionListView.as_view(), name='mission-list'),
    path('missions/<int:pk>/complete/', MissionCompleteView.as_view(), name='mission-complete'),
    path('missions/review-queue/', MissionReviewQueueView.as_view(), name='mission-review-queue'),
    path('missions/attempts/<int:pk>/review/', MissionReviewView.as_view(), name='mission-review'),
    path('', include(router.urls)),
]
