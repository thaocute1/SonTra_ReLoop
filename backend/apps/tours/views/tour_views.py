from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ..services.tour_service import TourService
from ..serializers.tour_serializers import (
    TourCreateSerializer,
    TourScheduleCreateSerializer,
    TourBookingRequestSerializer,
)


class PublicTourListView(APIView):
    """
    GET /api/v1/tours/
    Danh sách các tour trekking sinh thái đã được duyệt và đang mở bán cho du khách
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        difficulty = request.query_params.get('difficulty')
        search = request.query_params.get('search')
        tours = TourService.get_published_tours(difficulty=difficulty, search=search)
        return Response({
            "status": "success",
            "data": tours
        }, status=status.HTTP_200_OK)


class PublicTourDetailView(APIView):
    """
    GET /api/v1/tours/<int:pk>/
    Chi tiết tour kèm các Chuyến Khởi Hành (Departure Slots) còn chỗ
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        tour = TourService.get_tour_detail(pk)
        if not tour:
            return Response({
                "status": "error",
                "message": "Không tìm thấy trải nghiệm trekking yêu cầu."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "data": tour
        }, status=status.HTTP_200_OK)


class VendorTourListView(APIView):
    """
    GET /api/v1/vendors/tours/ - Danh sách tour của Vendor
    POST /api/v1/vendors/tours/ - Vendor tạo trải nghiệm trekking mới
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        vendor_id = request.query_params.get('vendor_id')
        tours = TourService.get_vendor_tours(vendor_id)
        return Response({
            "status": "success",
            "data": tours
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TourCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Dữ liệu tạo tour không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        vendor_id = request.data.get('vendor_id') or serializer.validated_data.get('vendor_id')
        if not vendor_id and getattr(request, 'user', None) and request.user.is_authenticated:
            vendor = getattr(request.user, 'vendors', None)
            if vendor:
                vendor_id = vendor.id
        new_tour = TourService.create_vendor_tour(vendor_id, serializer.validated_data)

        return Response({
            "status": "success",
            "message": f"Tạo trải nghiệm '{new_tour['title']}' thành công! Đã gửi BQL phê duyệt.",
            "data": new_tour
        }, status=status.HTTP_201_CREATED)


class VendorTourScheduleCreateView(APIView):
    """
    POST /api/v1/vendors/tours/<int:pk>/schedules/
    Vendor mở thêm chuyến khởi hành mới cho tour (Ngày đi, Giờ đón, Số chỗ tối đa, HDV)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        serializer = TourScheduleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Dữ liệu chuyến khởi hành không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        new_schedule = TourService.create_tour_schedule(pk, serializer.validated_data)
        if not new_schedule:
            return Response({
                "status": "error",
                "message": f"Không tìm thấy tour với ID {pk}."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "message": f"Mở chuyến khởi hành ngày {new_schedule['departure_date']} thành công!",
            "data": new_schedule
        }, status=status.HTTP_201_CREATED)


class TourBookingCreateView(APIView):
    """
    POST /api/v1/orders/booking/ hoặc /api/v1/tours/booking/
    Du khách (hoặc Vendor) đặt chỗ cho Chuyến Khởi Hành cụ thể:
    - Kiểm tra số chỗ trống
    - Tự động trừ slot
    - Phân tách 10% Quỹ Bảo tồn Sơn Trà
    - Xuất Vé Điện Tử E-Ticket có mã QR
    - Đồng bộ ngay lập tức sang Vendor Bookings
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TourBookingRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Thông tin đặt tour không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = TourService.book_tour_slot(serializer.validated_data)
            return Response({
                "status": "success",
                "message": f"Đặt vé tour thành công! Mã đơn của bạn là #{booking['order_code']}.",
                "data": booking
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({
                "status": "error",
                "message": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi khi đặt tour: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class TourRouteMapView(APIView):
    """
    GET /api/v1/tours/<int:pk>/route-map/
    Lấy thông tin lộ trình bản đồ (tọa độ polyline, checkpoints, cự ly, file gpx)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        route_map = TourService.get_tour_route_map(pk)
        if not route_map:
            return Response({
                "status": "error",
                "message": f"Không tìm thấy lộ trình của tour #{pk}."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "data": route_map
        }, status=status.HTTP_200_OK)


class CustomerTourBookingsListView(APIView):
    """
    GET /api/v1/tours/my-bookings/ hoặc /api/v1/orders/my-bookings/
    Khách du lịch xem lịch sử các đơn đặt chỗ tour trekking và vé E-Ticket
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        status_filter = request.query_params.get('status', 'all')
        email = request.query_params.get('email')
        bookings = TourService.get_customer_bookings(
            user=request.user if request.user.is_authenticated else None,
            email=email,
            status=status_filter
        )
        return Response({
            "status": "success",
            "total": len(bookings),
            "data": bookings
        }, status=status.HTTP_200_OK)

