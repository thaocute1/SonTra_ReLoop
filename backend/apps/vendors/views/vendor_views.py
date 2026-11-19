from ..services.trip_chat_service import TripChatService
from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from common.permissions import IsBQL, IsVendorOrBQL
from ..models import Guides, Vendors
from ..serializers.vendor_serializers import (
    VendorRegisterSerializer,
    VendorApplicationListSerializer,
    VendorApplicationDetailSerializer,
    VendorCompanyProfileSerializer,
    VendorReviewActionSerializer,
    VendorGuideSerializer,
    GuideTeammateSerializer,
    VendorGuideCreateSerializer,
)
from ..services.vendor_service import VendorService
from ..services.guide_service import VendorGuideService
from ..services.vendor_finance import DEFAULT_REVENUE_PERIOD, REVENUE_PERIODS


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
    permission_classes = [permissions.IsAuthenticated, IsBQL]

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
    permission_classes = [permissions.IsAuthenticated, IsBQL]

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
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def get(self, request, pk):
        vendor = VendorService.get_application_detail(pk)
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
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def patch(self, request, pk):
        vendor = VendorService.get_application_detail(pk)
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


class VendorCompanyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'vendor_admin':
            raise PermissionDenied('Tài khoản không có quyền truy cập cổng đối tác.')
        vendor = Vendors.objects.filter(
            user_id=request.user.id, deleted_at__isnull=True,
        ).select_related('user').annotate(guides_count=Count('guides')).first()
        if vendor is None:
            raise PermissionDenied('Tài khoản chưa có hồ sơ đối tác.')
        return Response({'status': 'success', 'data': VendorCompanyProfileSerializer(vendor).data})


class VendorGuidesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _require_vendor(self, request):
        if request.user.role != 'vendor_admin':
            raise PermissionDenied('Chỉ tài khoản đối tác mới được quản lý hướng dẫn viên.')

    def get(self, request):
        self._require_vendor(request)
        guides = VendorGuideService.list_guides(request.user.id)
        return Response({
            'status': 'success',
            'data': VendorGuideSerializer(guides, many=True).data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        self._require_vendor(request)
        serializer = VendorGuideCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guide = VendorGuideService.create_guide(request.user.id, serializer.validated_data)
        if guide is None:
            raise PermissionDenied('Chỉ đối tác đã được duyệt mới có thể tạo tài khoản hướng dẫn viên.')
        return Response({
            'status': 'success',
            'message': 'Đã tạo tài khoản hướng dẫn viên.',
            'data': VendorGuideSerializer(guide).data,
        }, status=status.HTTP_201_CREATED)


class GuideTeamView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'guide':
            raise PermissionDenied('Chỉ hướng dẫn viên mới được xem đội ngũ cùng đơn vị.')
        guides = VendorGuideService.list_teammates(request.user.id)
        if guides is None:
            raise PermissionDenied('Tài khoản chưa có hồ sơ hướng dẫn viên thuộc đơn vị.')
        return Response({
            'status': 'success',
            'data': GuideTeammateSerializer(guides, many=True).data,
        }, status=status.HTTP_200_OK)


class VendorDashboardView(APIView):
    """
    GET /api/v1/vendors/dashboard/
    Thống kê và đối soát cho đối tác đã xác thực.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'vendor_admin':
            raise PermissionDenied('Tài khoản không có quyền truy cập cổng đối tác.')
        vendor_id = Vendors.objects.filter(
            user_id=request.user.id, deleted_at__isnull=True,
        ).values_list('id', flat=True).first()
        if vendor_id is None:
            raise PermissionDenied('Tài khoản chưa có hồ sơ đối tác.')
        period = request.query_params.get('period', DEFAULT_REVENUE_PERIOD)
        if period not in REVENUE_PERIODS:
            raise ValidationError({'period': 'Chọn 7d, 30d, 3m hoặc 12m.'})
        data = VendorService.get_vendor_dashboard(vendor_id, period)
        return Response({
            "status": "success",
            "data": data
        }, status=status.HTTP_200_OK)


def _get_owned_vendor_id(user):
    vendor_id = Vendors.objects.filter(
        user_id=user.id, deleted_at__isnull=True,
    ).values_list('id', flat=True).first()
    if vendor_id is None:
        raise PermissionDenied('Tài khoản chưa có hồ sơ đối tác.')
    return vendor_id


class VendorBookingsListView(APIView):
    """
    GET /api/v1/vendors/bookings/
    Lấy danh sách các đơn đặt tour của Vendor kèm bộ lọc (status, search, date)
    """
    permission_classes = [permissions.IsAuthenticated, IsVendorOrBQL]

    def get(self, request):
        status_filter = request.query_params.get('status')
        search_filter = request.query_params.get('search')
        date_filter = request.query_params.get('date')

        is_vendor = request.user.role == 'vendor_admin'
        vendor_id = _get_owned_vendor_id(request.user) if is_vendor else request.query_params.get('vendor_id')

        data = VendorService.get_vendor_bookings(
            vendor_id=vendor_id,
            status=status_filter,
            search=search_filter,
            date=date_filter,
            require_vendor=is_vendor,
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
    permission_classes = [permissions.IsAuthenticated, IsVendorOrBQL]

    def post(self, request):
        vendor_id = _get_owned_vendor_id(request.user) if request.user.role == 'vendor_admin' else request.data.get('vendor_id')
        try:
            booking = VendorService.create_vendor_booking(request.data, vendor_id=vendor_id)
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
    permission_classes = [permissions.IsAuthenticated, IsVendorOrBQL]

    def patch(self, request, booking_id):
        new_status = request.data.get('status')
        if not new_status:
            return Response({
                "status": "error",
                "message": "Trường 'status' là bắt buộc."
            }, status=status.HTTP_400_BAD_REQUEST)

        vendor_id = _get_owned_vendor_id(request.user) if request.user.role == 'vendor_admin' else None
        updated = VendorService.update_booking_status(booking_id, new_status, vendor_id=vendor_id)
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = request.query_params.get('search', '')
        role = getattr(request.user, 'role', '')
        vendor_id = None
        customer_id = None
        email = None

        if role in ['system_admin', 'staff']:
            vendor_id = request.query_params.get('vendor_id')
            customer_id = request.query_params.get('customer_id')
            email = request.query_params.get('email')
        elif role in ['vendor', 'vendor_admin']:
            vendor_id = _get_owned_vendor_id(request.user)
        elif role == 'guide':
            guide = Guides.objects.filter(user_id=request.user.id).first()
            if not guide:
                raise PermissionDenied('Tài khoản chưa có hồ sơ hướng dẫn viên.')
            vendor_id = guide.vendor_id
        else:
            customer_id = request.user.id
            email = request.user.email

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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tour_id = request.query_params.get('tour_id')
        scheduled_date = request.query_params.get('date')

        if not tour_id or not scheduled_date:
            return Response({
                "status": "error",
                "message": "Thiếu tham số 'tour_id' hoặc 'date'."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not TripChatService._parse_scheduled_date(scheduled_date):
            return Response({
                "status": "error",
                "message": "Tham số 'date' không hợp lệ (định dạng YYYY-MM-DD)."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not TripChatService.user_can_access_trip(request.user, tour_id, scheduled_date):
            raise PermissionDenied('Bạn không có quyền truy cập phòng chat chuyến đi này.')

        data = TripChatService.get_trip_messages(
            tour_id=tour_id,
            scheduled_date_str=scheduled_date,
            current_user_id=request.user.id
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

        if not tour_id or not content or not scheduled_date:
            return Response({
                "status": "error",
                "message": "Thiếu 'tour_id', 'scheduled_date' hoặc nội dung 'content'."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not TripChatService._parse_scheduled_date(scheduled_date):
            return Response({
                "status": "error",
                "message": "Tham số 'scheduled_date' không hợp lệ (định dạng YYYY-MM-DD)."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not TripChatService.user_can_access_trip(request.user, tour_id, scheduled_date):
            raise PermissionDenied('Bạn không có quyền gửi tin nhắn vào phòng chat chuyến đi này.')

        try:
            msg = TripChatService.send_message(
                tour_id=tour_id,
                scheduled_date_str=scheduled_date,
                content=content,
                message_type=message_type,
                image_url=image_url,
                sender_id=request.user.id
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

