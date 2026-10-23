from django.urls import path
from .views.tour_views import (
    PublicTourListView,
    PublicTourDetailView,
    VendorTourListView,
    VendorTourScheduleCreateView,
    TourBookingCreateView,
    TourRouteMapView,
)

app_name = 'tours'

urlpatterns = [
    # 1. Khách du lịch xem danh sách & chi tiết tour kèm lịch khởi hành
    path('', PublicTourListView.as_view(), name='tour-list'),
    path('<int:pk>/', PublicTourDetailView.as_view(), name='tour-detail'),
    path('<int:pk>/route-map/', TourRouteMapView.as_view(), name='tour-route-map'),

    # 2. Đặt chỗ tour (Booking)
    path('booking/', TourBookingCreateView.as_view(), name='tour-booking'),

    # 3. Quản lý tour dành cho Vendor
    path('vendor/tours/', VendorTourListView.as_view(), name='vendor-tour-list-create'),
    path('vendor/tours/<int:pk>/schedules/', VendorTourScheduleCreateView.as_view(), name='vendor-tour-schedule-create'),
    path('vendor/tours/<int:pk>/route-map/', TourRouteMapView.as_view(), name='vendor-tour-route-map'),
]
