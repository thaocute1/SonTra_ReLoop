from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tours.views.tour_views import TourBookingCreateView, CustomerTourBookingsListView

app_name = 'orders'
router = DefaultRouter()

urlpatterns = [
    path('booking/', TourBookingCreateView.as_view(), name='order-booking'),
    path('my-bookings/', CustomerTourBookingsListView.as_view(), name='customer-orders-my-bookings'),
    path('', include(router.urls)),
]
