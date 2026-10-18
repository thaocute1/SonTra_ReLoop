from django.urls import path
from .views.vendor_views import (
    VendorRegisterView,
    VendorApplicationsView,
    VendorApplicationStatsView,
    VendorApplicationDetailView,
    VendorApplicationReviewView,
    VendorDashboardView,
    VendorBookingsListView,
    VendorBookingCreateView,
    VendorBookingStatusUpdateView
)
from apps.tours.views.tour_views import VendorTourListView, VendorTourScheduleCreateView

app_name = 'vendors'

urlpatterns = [
    # 1. Đăng ký đối tác mới từ Cổng Đối tác
    path('register/', VendorRegisterView.as_view(), name='vendor-register'),

    # 2. Danh sách hồ sơ đối tác & Thống kê cho Admin BQL
    path('applications/', VendorApplicationsView.as_view(), name='vendor-applications-list'),
    path('applications/stats/', VendorApplicationStatsView.as_view(), name='vendor-applications-stats'),

    # 3. Chi tiết và Thẩm định phê duyệt hồ sơ đối tác
    path('applications/<int:pk>/', VendorApplicationDetailView.as_view(), name='vendor-application-detail'),
    path('applications/<int:pk>/review/', VendorApplicationReviewView.as_view(), name='vendor-application-review'),

    # 4. Thống kê và thông tin tổng quan Vendor Dashboard
    path('dashboard/', VendorDashboardView.as_view(), name='vendor-dashboard'),

    # 5. Lịch và Đơn đặt tour của Vendor
    path('bookings/', VendorBookingsListView.as_view(), name='vendor-bookings-list'),
    path('bookings/create/', VendorBookingCreateView.as_view(), name='vendor-booking-create'),
    path('bookings/<str:booking_id>/status/', VendorBookingStatusUpdateView.as_view(), name='vendor-booking-status-update'),

    # 6. Quản lý tour & Lịch khởi hành của Vendor
    path('tours/', VendorTourListView.as_view(), name='vendor-tours-list-create'),
    path('tours/<int:pk>/schedules/', VendorTourScheduleCreateView.as_view(), name='vendor-tour-schedule-create'),
]

