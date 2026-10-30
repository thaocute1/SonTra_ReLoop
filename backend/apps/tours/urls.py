from django.urls import path
from .views.tour_views import (
    PublicTourListView,
    PublicTourDetailView,
    VendorTourListView,
    VendorTourScheduleCreateView,
    TourBookingCreateView,
    TourRouteMapView,
    CustomerTourBookingsListView,
)
from apps.vendors.views.vendor_views import (
    VendorInboxTripsView,
    VendorTripChatMessagesView,
)

app_name = 'tours'

urlpatterns = [
    # 1. Khách du lịch xem danh sách, vé của tôi & chi tiết tour kèm lịch khởi hành
    path('', PublicTourListView.as_view(), name='tour-list'),
    path('my-bookings/', CustomerTourBookingsListView.as_view(), name='customer-tour-bookings'),
    path('<int:pk>/', PublicTourDetailView.as_view(), name='tour-detail'),
    path('<int:pk>/route-map/', TourRouteMapView.as_view(), name='tour-route-map'),

    # 2. Đặt chỗ tour (Booking)
    path('booking/', TourBookingCreateView.as_view(), name='tour-booking'),

    # 3. Quản lý tour dành cho Vendor
    path('vendor/tours/', VendorTourListView.as_view(), name='vendor-tour-list-create'),
    path('vendor/tours/<int:pk>/schedules/', VendorTourScheduleCreateView.as_view(), name='vendor-tour-schedule-create'),
    path('vendor/tours/<int:pk>/route-map/', TourRouteMapView.as_view(), name='vendor-tour-route-map'),

    # 4. Hộp thư & Phòng chat điều phối chuyến đi thực địa dành cho Du Khách
    path('inbox/trips/', VendorInboxTripsView.as_view(), name='customer-inbox-trips'),
    path('inbox/messages/', VendorTripChatMessagesView.as_view(), name='customer-inbox-messages'),
]
