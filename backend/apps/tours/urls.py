from django.urls import path
from .views.field_views import FieldTripView, MyFieldTripsView, FieldSupportView, GuideAssignmentView
from .views.tour_views import (
    PublicTourListView,
    PublicTourDetailView,
    VendorTourListView,
    VendorTourScheduleCreateView,
    TourBookingCreateView,
    TourRouteMapView,
    CustomerTourBookingsListView,
    GuideScheduleListView,
    GuideScheduleParticipantsView,
    GuideAttendanceCreateView,
    GuideTripStartView,
    GuideTripFinishView,
)
from apps.vendors.views.vendor_views import (
    VendorInboxTripsView,
    VendorTripChatMessagesView,
)

app_name = 'tours'

urlpatterns = [
    path('vendor/schedules/<int:schedule_id>/guide/', GuideAssignmentView.as_view(), name='guide-assignment'),
    path('field/my-trips/', MyFieldTripsView.as_view(), name='field-my-trips'),
    path('field/<int:schedule_id>/', FieldTripView.as_view(), name='field-trip'),
    path('field/<int:schedule_id>/support/<int:event_id>/', FieldSupportView.as_view(), name='field-support'),
    # 1. Khách du lịch xem danh sách, vé của tôi & chi tiết tour kèm lịch khởi hành
    path('', PublicTourListView.as_view(), name='tour-list'),
    path('my-bookings/', CustomerTourBookingsListView.as_view(), name='customer-tour-bookings'),
    path('guide/schedules/', GuideScheduleListView.as_view(), name='guide-schedules'),
    path('guide/schedules/<int:schedule_id>/participants/', GuideScheduleParticipantsView.as_view(), name='guide-schedule-participants'),
    path('guide/schedules/<int:schedule_id>/participants/<int:participant_id>/', GuideScheduleParticipantsView.as_view(), name='guide-participant-update'),
    path('guide/schedules/<int:schedule_id>/attendance/', GuideAttendanceCreateView.as_view(), name='guide-attendance-create'),
    path('guide/schedules/<int:schedule_id>/start/', GuideTripStartView.as_view(), name='guide-trip-start'),
    path('guide/schedules/<int:schedule_id>/finish/', GuideTripFinishView.as_view(), name='guide-trip-finish'),
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
