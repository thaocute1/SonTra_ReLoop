from django.urls import path
from .views.auth_views import (
    RegisterView, LoginView, GoogleOAuthView, FacebookOAuthView,
    TokenRefreshView, ForgotPasswordView, UserProfileView,
    AdminUserListView, AdminUserToggleStatusView
)
from .views.staff_views import StaffManagementView

app_name = 'accounts'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('google/', GoogleOAuthView.as_view(), name='google_oauth'),
    path('facebook/', FacebookOAuthView.as_view(), name='facebook_oauth'),
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('staffs/', StaffManagementView.as_view(), name='staff_management'),

    # AD-02: Quản lý người dùng Admin
    path('users/', AdminUserListView.as_view(), name='admin_users_list'),
    path('users/<int:pk>/toggle-status/', AdminUserToggleStatusView.as_view(), name='admin_users_toggle_status'),
]
