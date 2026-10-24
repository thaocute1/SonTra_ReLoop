from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.admin_payment_views import (
    ConservationFundAdminView,
    ConservationFundAllocateView,
    PayoutAdminListView,
    PayoutExecuteView,
    RevenueReportAdminView
)

app_name = 'payments'
router = DefaultRouter()

urlpatterns = [
    # AD-04: Quản lý Quỹ bảo tồn
    path('conservation-funds/', ConservationFundAdminView.as_view(), name='admin-conservation-funds'),
    path('conservation-funds/allocate/', ConservationFundAllocateView.as_view(), name='admin-conservation-funds-allocate'),

    # AD-05: Đối soát & Split-Payment Payout
    path('payouts/', PayoutAdminListView.as_view(), name='admin-payouts-list'),
    path('payouts/execute/', PayoutExecuteView.as_view(), name='admin-payouts-execute'),

    # AD-06: Báo cáo & Thống kê doanh thu
    path('reports/revenue/', RevenueReportAdminView.as_view(), name='admin-revenue-reports'),

    path('', include(router.urls)),
]
