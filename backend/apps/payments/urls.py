from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.admin_payment_views import (
    ConservationFundAdminView,
    ConservationFundAllocateView,
    PayoutAdminListView,
    PayoutExecuteView,
    RefundAdminListView,
    RefundProcessAdminView,
    RevenueReportAdminView
)
from .views.payos_views import (
    PayOSCancelPaymentLinkView,
    PayOSCreatePaymentLinkView,
    PayOSCheckStatusView,
    PayOSWebhookView
)

app_name = 'payments'
from .views.paypal_views import (
    PayPalConfigView, PayPalCreateOrderView, PayPalCaptureView, PayPalStatusView, PayPalCancelView, PayPalWebhookView,
)
from .views.vnpay_views import (
    VNPayConfigView,
    VNPayCreatePaymentView,
    VNPayReturnVerifyView,
    VNPayStatusView,
    VNPayCancelView,
    VNPayIPNView,
)
router = DefaultRouter()

urlpatterns = [
    path('vnpay/config/', VNPayConfigView.as_view(), name='vnpay-config'),
    path('vnpay/create-payment/', VNPayCreatePaymentView.as_view(), name='vnpay-create-payment'),
    path('vnpay/return/', VNPayReturnVerifyView.as_view(), name='vnpay-return'),
    path('vnpay/status/<int:order_id>/', VNPayStatusView.as_view(), name='vnpay-status'),
    path('vnpay/cancel/', VNPayCancelView.as_view(), name='vnpay-cancel'),
    path('vnpay/ipn/', VNPayIPNView.as_view(), name='vnpay-ipn'),
    path('paypal/config/', PayPalConfigView.as_view(), name='paypal-config'),
    path('paypal/create-order/', PayPalCreateOrderView.as_view(), name='paypal-create-order'),
    path('paypal/capture/', PayPalCaptureView.as_view(), name='paypal-capture'),
    path('paypal/status/<int:order_id>/', PayPalStatusView.as_view(), name='paypal-status'),
    path('paypal/cancel/', PayPalCancelView.as_view(), name='paypal-cancel'),
    path('paypal/webhook/', PayPalWebhookView.as_view(), name='paypal-webhook'),
    # PayOS VietQR Payment Endpoints
    path('payos/create-link/', PayOSCreatePaymentLinkView.as_view(), name='payos-create-link'),
    path('payos/check-status/<int:order_code>/', PayOSCheckStatusView.as_view(), name='payos-check-status'),
    path('payos/cancel-link/', PayOSCancelPaymentLinkView.as_view(), name='payos-cancel-link'),
    path('payos/webhook/', PayOSWebhookView.as_view(), name='payos-webhook'),

    # AD-04: Quản lý Quỹ bảo tồn
    path('conservation-funds/', ConservationFundAdminView.as_view(), name='admin-conservation-funds'),
    path('conservation-funds/allocate/', ConservationFundAllocateView.as_view(), name='admin-conservation-funds-allocate'),

    # AD-05: Đối soát & Split-Payment Payout
    path('payouts/', PayoutAdminListView.as_view(), name='admin-payouts-list'),
    path('payouts/execute/', PayoutExecuteView.as_view(), name='admin-payouts-execute'),
    path('refunds/', RefundAdminListView.as_view(), name='admin-refunds-list'),
    path('refunds/<int:order_vendor_id>/process/', RefundProcessAdminView.as_view(), name='admin-refund-process'),

    # AD-06: Báo cáo & Thống kê doanh thu
    path('reports/revenue/', RevenueReportAdminView.as_view(), name='admin-revenue-reports'),

    path('', include(router.urls)),
]
