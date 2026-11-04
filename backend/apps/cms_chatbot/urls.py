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
    IncidentReportCreateView,
    NotificationListView,
    AdminPostListView,
    AdminPostReviewView
)
from .views.admin_incident_views import (
    AdminIncidentListView,
    AdminIncidentUpdateView
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
    
    # Incident Reporting (KH-12) & Admin Incident Management (AD-08)
    path('community/incidents/', IncidentReportCreateView.as_view(), name='community-incidents'),
    path('community/notifications/', NotificationListView.as_view(), name='community-notifications'),
    # Admin Community Posts Moderation (AD-03)
    path('community/admin/posts/', AdminPostListView.as_view(), name='admin-community-posts-list'),
    path('community/admin/posts/<int:post_id>/review/', AdminPostReviewView.as_view(), name='admin-community-posts-review'),


    path('incidents/admin/', AdminIncidentListView.as_view(), name='admin-incidents-list'),
    path('incidents/admin/<str:incident_id>/', AdminIncidentUpdateView.as_view(), name='admin-incidents-update'),
    
    path('', include(router.urls)),
]
