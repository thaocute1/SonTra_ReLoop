from ..services.trip_chat_service import TripChatService
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from ..serializers.vendor_serializers import (
    VendorRegisterSerializer,
    VendorApplicationListSerializer,
    VendorApplicationDetailSerializer,
    VendorReviewActionSerializer
)
from ..services.vendor_service import VendorService


class VendorRegisterView(APIView):
    """
    POST /api/v1/vendors/register/
    Endpoint công khai tiếp nhận hồ sơ đăng ký đối tác từ Cổng Đối tác
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VendorRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Dữ liệu hồ sơ không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            vendor = VendorService.register_vendor(serializer.validated_data)
            response_serializer = VendorApplicationDetailSerializer(vendor)
            return Response({
                "status": "success",
                "message": "Hồ sơ đối tác đã được gửi thành công và đang chờ Ban Quản Lý thẩm định.",
                "data": response_serializer.data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi khi lưu hồ sơ vào cơ sở dữ liệu: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorApplicationsView(APIView):
    """
    GET /api/v1/vendors/applications/
    Endpoint dành cho Admin BQL lấy danh sách hồ sơ đối tác (hỗ trợ filter status và search)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        status_param = request.query_params.get('status', 'all')
        search_param = request.query_params.get('search', '')

        try:
            applications = VendorService.get_applications(
                status=status_param,
                search=search_param
            )
            serializer = VendorApplicationListSerializer(applications, many=True)
            return Response({
                "status": "success",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi khi truy vấn danh sách hồ sơ: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorApplicationStatsView(APIView):
    """
    GET /api/v1/vendors/applications/stats/
    Thống kê số lượng hồ sơ theo từng trạng thái (tổng, chờ duyệt, đã duyệt, cần bổ sung, từ chối)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            stats_data = VendorService.get_stats()
            return Response({
                "status": "success",
                "data": stats_data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi khi thống kê hồ sơ: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorApplicationDetailView(APIView):
    """
    GET /api/v1/vendors/applications/<int:pk>/
    Xem chi tiết hồ sơ đối tác
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        vendor = VendorService.get_application_by_id(pk)
        if not vendor:
            return Response({
                "status": "error",
                "message": "Không tìm thấy hồ sơ đối tác yêu cầu."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = VendorApplicationDetailSerializer(vendor)
        return Response({
            "status": "success",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class VendorApplicationReviewView(APIView):
    """
    PATCH /api/v1/vendors/applications/<int:pk>/review/
    Thẩm định hồ sơ đối tác: Phê duyệt (kích hoạt tài khoản), Từ chối hoặc Yêu cầu bổ sung
    """
    permission_classes = [permissions.AllowAny]

    def patch(self, request, pk):
        vendor = VendorService.get_application_by_id(pk)
        if not vendor:
            return Response({
                "status": "error",
                "message": "Không tìm thấy hồ sơ đối tác yêu cầu."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = VendorReviewActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Thông tin thẩm định không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            admin_user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
            updated_vendor = VendorService.review_application(
                vendor_id=pk,
                new_status=serializer.validated_data['status'],
                reason=serializer.validated_data.get('rejection_reason', ''),
                admin_user=admin_user
            )

            status_messages = {
                'approved': 'Đã phê duyệt đối tác thành công. Tài khoản đối tác đã được kích hoạt.',
                'need_info': 'Đã cập nhật trạng thái yêu cầu bổ sung hồ sơ.',
                'rejected': 'Đã từ chối hồ sơ đối tác.'
            }

            return Response({
                "status": "success",
                "message": status_messages.get(updated_vendor.status, 'Đã cập nhật trạng thái hồ sơ.'),
                "data": VendorApplicationDetailSerializer(updated_vendor).data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi khi cập nhật thẩm định hồ sơ: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorDashboardView(APIView):
    """
    GET /api/v1/vendors/dashboard/
    Endpoint cung cấp dữ liệu thống kê tổng quan cho Vendor Dashboard (khớp Figma 100%)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        vendor_id = request.query_params.get('vendor_id')
        data = VendorService.get_vendor_dashboard(vendor_id)
        return Response({
            "status": "success",
            "data": data
        }, status=status.HTTP_200_OK)


class VendorBookingsListView(APIView):
    """
    GET /api/v1/vendors/bookings/
    Lấy danh sách các đơn đặt tour của Vendor kèm bộ lọc (status, search, date)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        status_filter = request.query_params.get('status')
        search_filter = request.query_params.get('search')
        date_filter = request.query_params.get('date')
        vendor_id = request.query_params.get('vendor_id')

        data = VendorService.get_vendor_bookings(
            vendor_id=vendor_id,
            status=status_filter,
            search=search_filter,
            date=date_filter
        )
        return Response({
            "status": "success",
            "data": data
        }, status=status.HTTP_200_OK)


class VendorBookingCreateView(APIView):
    """
    POST /api/v1/vendors/bookings/create/
    Tạo đơn đặt tour mới cho khách hàng (đặt trực tiếp tại quầy, hotline hoặc fanpage)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            booking = VendorService.create_vendor_booking(request.data)
            return Response({
                "status": "success",
                "message": f"Tạo đơn đặt #{booking['order_code']} thành công!",
                "data": booking
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Không thể tạo đơn đặt tour: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class VendorBookingStatusUpdateView(APIView):
    """
    PATCH /api/v1/vendors/bookings/<str:booking_id>/status/
    Cập nhật trạng thái đơn (xác nhận, hoàn thành, hủy)
    """
    permission_classes = [permissions.AllowAny]

    def patch(self, request, booking_id):
        new_status = request.data.get('status')
        if not new_status:
            return Response({
                "status": "error",
                "message": "Trường 'status' là bắt buộc."
            }, status=status.HTTP_400_BAD_REQUEST)

        updated = VendorService.update_booking_status(booking_id, new_status)
        if not updated:
            return Response({
                "status": "error",
                "message": f"Không tìm thấy đơn đặt {booking_id}."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "message": f"Đã cập nhật trạng thái đơn #{booking_id} thành '{updated['status_label']}'.",
            "data": updated
        }, status=status.HTTP_200_OK)

class VendorInboxTripsView(APIView):
    """
    GET /api/v1/vendors/inbox/trips/ hoặc /api/v1/tours/inbox/trips/
    Danh sách các chuyến đi thực địa có phòng chat 3 bên.
    Hỗ trợ cả Hướng Dẫn Viên, BQL Kiểm Lâm và Du Khách đã đặt chỗ.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        vendor_id = request.query_params.get('vendor_id')
        customer_id = request.query_params.get('customer_id')
        email = request.query_params.get('email')
        search = request.query_params.get('search', '')

        # Tự động nhận diện vai trò người dùng nếu có token xác thực
        if request.user and request.user.is_authenticated:
            if request.user.role == 'customer' and not customer_id:
                customer_id = request.user.id
            elif request.user.role in ['vendor', 'vendor_admin'] and not vendor_id:
                from apps.vendors.models import Vendors
                v = Vendors.objects.filter(user=request.user).first()
                if v:
                    vendor_id = v.id

        trips = TripChatService.get_trip_channels(
            vendor_id=vendor_id,
            customer_id=customer_id,
            email=email,
            search=search
        )
        return Response({
            "status": "success",
            "data": trips
        }, status=status.HTTP_200_OK)


class VendorTripChatMessagesView(APIView):
    """
    GET /api/v1/vendors/inbox/messages/?tour_id=6&date=2026-10-24
    POST /api/v1/vendors/inbox/messages/
    Phòng trao đổi trực tiếp giữa Hướng Dẫn Viên đoàn, Khách du lịch và BQL Kiểm Lâm
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tour_id = request.query_params.get('tour_id')
        scheduled_date = request.query_params.get('date')

        if not tour_id:
            return Response({
                "status": "error",
                "message": "Thiếu tham số 'tour_id'."
            }, status=status.HTTP_400_BAD_REQUEST)

        current_user_id = request.user.id if request.user and request.user.is_authenticated else None
        data = TripChatService.get_trip_messages(
            tour_id=tour_id,
            scheduled_date_str=scheduled_date,
            current_user_id=current_user_id
        )

        if not data:
            return Response({
                "status": "error",
                "message": f"Không tìm thấy chuyến đi Tour #{tour_id}."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "data": data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        tour_id = request.data.get('tour_id')
        scheduled_date = request.data.get('scheduled_date')
        content = request.data.get('content')
        message_type = request.data.get('message_type', 'text')
        image_url = request.data.get('image_url')
        sender_id = request.data.get('sender_id')

        if not tour_id or not content:
            return Response({
                "status": "error",
                "message": "Thiếu 'tour_id' hoặc nội dung 'content'."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not sender_id and request.user and request.user.is_authenticated:
            sender_id = request.user.id

        try:
            msg = TripChatService.send_message(
                tour_id=tour_id,
                scheduled_date_str=scheduled_date,
                content=content,
                message_type=message_type,
                image_url=image_url,
                sender_id=sender_id
            )
            return Response({
                "status": "success",
                "message": "Gửi tin nhắn thành công.",
                "data": msg
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

