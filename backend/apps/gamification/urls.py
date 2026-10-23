from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.reward_views import (
    RewardListView,
    RedeemRewardView,
    MyVouchersView,
    PointsLedgerView,
    UserEcoStatsView
)

app_name = 'gamification'
router = DefaultRouter()

urlpatterns = [
    path('rewards/', RewardListView.as_view(), name='reward-list'),
    path('rewards/redeem/', RedeemRewardView.as_view(), name='reward-redeem'),
    path('my-vouchers/', MyVouchersView.as_view(), name='my-vouchers'),
    path('points-ledger/', PointsLedgerView.as_view(), name='points-ledger'),
    path('stats/', UserEcoStatsView.as_view(), name='user-stats'),
    path('', include(router.urls)),
]
