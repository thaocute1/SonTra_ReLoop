from django.urls import path
from apps.accounts.views.auth_views import (
    RegisterView, LoginView, GoogleOAuthView, FacebookOAuthView, UserProfileView
)

app_name = 'accounts'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('google/', GoogleOAuthView.as_view(), name='google_oauth'),
    path('facebook/', FacebookOAuthView.as_view(), name='facebook_oauth'),
    path('me/', UserProfileView.as_view(), name='user_profile'),
]
