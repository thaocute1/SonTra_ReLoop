from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.community_views import (
    CommunityPostListView,
    CommunityPostCreateView,
    CommunityPostLikeView,
    CommunityPostCommentView,
    CommunityLeaderboardView,
    CommunityEventsView,
    CommunityImpactCounterView,
    IncidentReportCreateView
)

app_name = 'cms_chatbot'
router = DefaultRouter()

urlpatterns = [
    # Community Multi-Actor Feed & Interactions
    path('community/posts/', CommunityPostListView.as_view(), name='community-posts-list'),
    path('community/posts/create/', CommunityPostCreateView.as_view(), name='community-posts-create'),
    path('community/posts/<int:post_id>/like/', CommunityPostLikeView.as_view(), name='community-posts-like'),
    path('community/posts/<int:post_id>/comments/', CommunityPostCommentView.as_view(), name='community-posts-comment'),
    
    # Leaderboard & Gamification Stats
    path('community/leaderboard/', CommunityLeaderboardView.as_view(), name='community-leaderboard'),
    path('community/events/', CommunityEventsView.as_view(), name='community-events'),
    path('community/impact-counter/', CommunityImpactCounterView.as_view(), name='community-impact-counter'),
    
    # Incident Reporting (KH-12)
    path('community/incidents/', IncidentReportCreateView.as_view(), name='community-incidents'),
    
    path('', include(router.urls)),
]
