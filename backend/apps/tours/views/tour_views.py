from django.conf import settings
from django.db import DatabaseError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ..services.tour_service import TourService
from ..serializers.tour_serializers import (
    TourCreateSerializer,
    TourScheduleCreateSerializer,
    TourBookingRequestSerializer,
)
from ..serializers.guide_trip_serializers import (
    AttendanceCreateSerializer,
    TourParticipantSerializer,
    TourParticipantUpdateSerializer,
)
from ..services.guide_trip_service import GuideTripService
from apps.vendors.models.vendor_models import Guides, Vendors
from common.permissions import IsGuide, IsVendor


class PublicTourListView(APIView):
    """
    GET /api/v1/tours/
    Danh sách các tour trekking sinh thái đã được duyệt và đang mở bán cho du khách
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        difficulty = request.query_params.get('difficulty')
        search = request.query_params.get('search')
        try:
            tours = TourService.get_published_tours(difficulty=difficulty, search=search)
        except DatabaseError:
            return Response({
                "status": "error",
                "code": "DATABASE_UNAVAILABLE",
                "message": "Kết nối cơ sở dữ liệu đang tạm quá tải. Vui lòng thử lại sau ít giây.",
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
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
        try:
            tour = TourService.get_tour_detail(pk)
        except DatabaseError:
            return Response({
                "status": "error",
                "code": "DATABASE_UNAVAILABLE",
                "message": "Kết nối cơ sở dữ liệu đang tạm quá tải. Vui lòng thử lại sau ít giây.",
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, 'role', '')
        if role == 'vendor_admin':
            vendor = Vendors.objects.filter(user_id=request.user.id, deleted_at__isnull=True).first()
            if vendor is None:
                return Response({'status': 'error', 'message': 'Tài khoản chưa có hồ sơ đơn vị.'}, status=status.HTTP_403_FORBIDDEN)
            vendor_id = vendor.id
        elif role in ('system_admin', 'staff'):
            vendor_id = request.query_params.get('vendor_id')
        else:
            return Response({'status': 'error', 'message': 'Bạn không có quyền truy cập danh sách tour đối tác.'}, status=status.HTTP_403_FORBIDDEN)

        tours = TourService.get_vendor_tours(vendor_id)
        return Response({
            "status": "success",
            "data": tours
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_authenticated or getattr(request.user, 'role', '') != 'vendor_admin':
            return Response({'status': 'error', 'message': 'Chỉ tài khoản vendor mới được tạo tour.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TourCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Dữ liệu tạo tour không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        vendor = Vendors.objects.filter(user_id=request.user.id, deleted_at__isnull=True).first()
        if vendor is None:
            return Response({'status': 'error', 'message': 'Tài khoản chưa có hồ sơ đơn vị.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            new_tour = TourService.create_vendor_tour(vendor.id, serializer.validated_data)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

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
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def post(self, request, pk):
        from ..models.tour_models import Tours
        if not Tours.objects.filter(id=pk, vendor__user_id=request.user.id).exists():
            return Response({'message': 'Không tìm thấy tour của đơn vị bạn.'}, status=404)
        guide_id = request.data.get('guide_id')
        if guide_id not in (None, ''):
            if not request.user.is_authenticated or getattr(request.user, 'role', '') != 'vendor_admin':
                return Response({
                    'status': 'error',
                    'message': 'Chỉ tài khoản đơn vị tổ chức mới được phân công hướng dẫn viên.',
                }, status=status.HTTP_403_FORBIDDEN)
            if not Guides.objects.filter(
                id=guide_id,
                vendor__user_id=request.user.id,
                user__role='guide',
                user__status='active',
                user__deleted_at__isnull=True,
            ).exists():
                return Response({
                    'status': 'error',
                    'message': 'Bạn chỉ được phân công hướng dẫn viên thuộc đơn vị của mình.',
                }, status=status.HTTP_403_FORBIDDEN)
        serializer = TourScheduleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Dữ liệu chuyến khởi hành không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_schedule = TourService.create_tour_schedule(pk, serializer.validated_data)
        except ValueError as exc:
            return Response({
                'status': 'error',
                'message': str(exc),
            }, status=status.HTTP_400_BAD_REQUEST)
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
    Du khách đã đăng nhập đặt chỗ cho chuyến khởi hành cụ thể:
    - Kiểm tra số chỗ trống
    - Tự động trừ slot
    - Tạo đơn chờ thanh toán tại điểm tập trung
    - Đồng bộ đặt chỗ sang danh sách quản lý của đối tác
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TourBookingRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Thông tin đặt tour không hợp lệ.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = TourService.book_tour_slot(
                serializer.validated_data,
                customer=request.user,
            )
            return Response({
                "status": "success",
                "message": f"Đặt chỗ thành công! Mã đơn của bạn là #{booking['order_code']}.",
                "data": booking
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            if getattr(ve, 'code', None) == 'FLASH_SALE_PRICE_CHANGED':
                return Response({
                    "status": "error",
                    "code": ve.code,
                    "message": str(ve),
                    "data": getattr(ve, 'payload', {}),
                }, status=status.HTTP_409_CONFLICT)
            return Response({
                "status": "error",
                "message": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            msg = f"Lỗi khi đặt tour: {str(e)}" if getattr(settings, 'DEBUG', False) else "Lỗi hệ thống khi đặt tour. Vui lòng thử lại."
            return Response({
                "status": "error",
                "message": msg
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorTourDetailView(APIView):
    """
    GET / PATCH / DELETE /api/v1/vendors/tours/<int:pk>/
    Vendor xem chi tiết, chỉnh sửa hoặc xóa mềm trải nghiệm của đơn vị mình.
    """
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def _get_vendor(self, request):
        return Vendors.objects.filter(user_id=request.user.id, deleted_at__isnull=True).first()

    def get(self, request, pk):
        vendor = self._get_vendor(request)
        if not vendor:
            return Response({'status': 'error', 'message': 'Tài khoản chưa có hồ sơ đơn vị.'}, status=status.HTTP_403_FORBIDDEN)
        tour = TourService.get_tour_detail(pk)
        if not tour or tour.get('vendor_id') != vendor.id:
            return Response({'status': 'error', 'message': 'Không tìm thấy tour của đơn vị bạn.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'success', 'data': tour}, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        vendor = self._get_vendor(request)
        if not vendor:
            return Response({'status': 'error', 'message': 'Tài khoản chưa có hồ sơ đơn vị.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            updated = TourService.update_vendor_tour(vendor.id, pk, request.data)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not updated:
            return Response({'status': 'error', 'message': 'Không tìm thấy tour của đơn vị bạn.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'status': 'success',
            'message': f"Đã cập nhật trải nghiệm '{updated['title']}' thành công.",
            'data': updated,
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        vendor = self._get_vendor(request)
        if not vendor:
            return Response({'status': 'error', 'message': 'Tài khoản chưa có hồ sơ đơn vị.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            deleted = TourService.delete_vendor_tour(vendor.id, pk)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not deleted:
            return Response({'status': 'error', 'message': 'Không tìm thấy tour của đơn vị bạn.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'success', 'message': 'Đã xóa trải nghiệm khỏi danh sách đang mở.', 'data': deleted}, status=status.HTTP_200_OK)


class TourReviewsView(APIView):
    """
    GET / POST /api/v1/tours/<int:pk>/reviews/
    KH-07: Xem danh sách đánh giá tour (AllowAny) và du khách gửi đánh giá sau chuyến đi (IsAuthenticated).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request, pk):
        rating_filter = request.query_params.get('rating')
        reviews = TourService.get_tour_reviews(
            pk,
            rating_filter=rating_filter,
            customer=request.user,
        )
        if not reviews:
            return Response({'status': 'error', 'message': 'Không tìm thấy trải nghiệm trekking.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'success', 'data': reviews}, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            created = TourService.create_tour_review(request.user, pk, request.data)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        pts = int(created.get('points_awarded', 10))
        if created.get('status') == 'pending_approval':
            msg = 'Đánh giá của bạn đã được ghi nhận và đang chờ BQL kiểm duyệt nội dung.'
        else:
            bonus_note = ' (Ưu đãi mở hàng tuyến mới!)' if created.get('is_early_reviewer_bonus') else ''
            msg = f'Cảm ơn bạn đã gửi đánh giá trải nghiệm! Bạn được thưởng +{pts} RE-Points{bonus_note}.'
        return Response({
            'status': 'success',
            'message': msg,
            'data': created,
        }, status=status.HTTP_201_CREATED)


class TourReviewDetailView(APIView):
    """
    PATCH /api/v1/tours/<int:pk>/reviews/<int:review_id>/
    Du khách chỉnh sửa đánh giá 1 lần trong vòng 48 giờ.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, review_id):
        try:
            updated = TourService.edit_tour_review(request.user, pk, review_id, request.data)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not updated:
            return Response({'status': 'error', 'message': 'Không tìm thấy đánh giá của bạn.'}, status=status.HTTP_404_NOT_FOUND)
        msg = (
            'Đã cập nhật đánh giá và gửi lại BQL kiểm duyệt nội dung.'
            if updated.get('status') == 'pending_approval'
            else 'Đã cập nhật đánh giá thành công.'
        )
        return Response({'status': 'success', 'message': msg, 'data': updated}, status=status.HTTP_200_OK)


class GuideReviewsView(APIView):
    """
    GET /api/v1/tours/guides/<int:guide_id>/reviews/ (hoặc /api/v1/guides/<int:guide_id>/reviews/)
    Xem điểm đánh giá và nhận xét dành cho Hướng dẫn viên.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, guide_id):
        data = TourService.get_guide_reviews(guide_id)
        if not data:
            return Response({'status': 'error', 'message': 'Không tìm thấy hướng dẫn viên.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class ReviewReportView(APIView):
    """
    POST /api/v1/tours/reviews/<int:review_id>/report/ (hoặc /api/v1/reviews/<int:review_id>/report/)
    Báo cáo đánh giá vi phạm tới BQL.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, review_id):
        try:
            res = TourService.report_review(request.user, review_id, request.data.get('reason'))
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not res:
            return Response({'status': 'error', 'message': 'Không tìm thấy đánh giá.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'status': 'success',
            'message': 'Đã gửi báo cáo đánh giá tới BQL kiểm tra.',
            'data': res,
        }, status=status.HTTP_200_OK)


class CustomerTourBookingCompleteView(APIView):
    """
    POST /api/v1/tours/my-bookings/<int:booking_id>/complete/
    Du khách xác nhận đã hoàn thành hành trình để chuyển đơn sang mục Đã hoàn thành & mở khóa Đánh giá.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        try:
            updated = TourService.complete_customer_booking(request.user, booking_id)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'status': 'success',
            'message': 'Đã xác nhận hoàn thành chuyến đi! Bây giờ bạn có thể gửi đánh giá trải nghiệm.',
            'data': updated,
        }, status=status.HTTP_200_OK)


class CustomerTourBookingRefundRequestView(APIView):
    """
    POST /api/v1/tours/my-bookings/<int:booking_id>/refund-request/
    Du khách gửi yêu cầu hủy đơn đã thanh toán & hoàn tiền.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        from apps.payments.services.refund_service import request_customer_refund

        reason = request.data.get('reason') or ''
        bank_info = {
            'bank_bin': request.data.get('bank_bin') or '',
            'bank_name': request.data.get('bank_name') or '',
            'account_number': request.data.get('account_number') or '',
            'account_holder': request.data.get('account_holder') or '',
        }
        try:
            updated = request_customer_refund(
                customer=request.user,
                order_vendor_id=booking_id,
                reason=reason,
                bank_info=bank_info,
            )
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'success',
            'message': 'Đã gửi yêu cầu hủy & hoàn tiền tới Ban Quản Lý Sơn Trà.',
            'data': updated,
        }, status=status.HTTP_200_OK)



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
    Khách du lịch xem lịch sử các đơn đặt chỗ tour trekking của chính mình
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status', 'all')
        try:
            bookings = TourService.get_customer_bookings(
                user=request.user,
                status=status_filter
            )
        except DatabaseError:
            return Response({
                "status": "error",
                "code": "DATABASE_UNAVAILABLE",
                "message": "Kết nối cơ sở dữ liệu đang tạm quá tải. Vui lòng thử lại sau ít giây.",
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({
            "status": "success",
            "total": len(bookings),
            "data": bookings
        }, status=status.HTTP_200_OK)


class GuideScheduleListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsGuide]

    def get(self, request):
        schedules = GuideTripService.assigned_schedules(request.user.id).order_by(
            'departure_date', 'start_time',
        )
        data = [{
            'id': schedule.id,
            'tour_id': schedule.tour_id,
            'tour_title': schedule.tour.title,
            'departure_date': schedule.departure_date,
            'start_time': schedule.start_time,
            'end_time': schedule.end_time,
            'booked_count': schedule.booked_count,
            'max_capacity': schedule.max_capacity,
            'status': schedule.status,
            'actual_started_at': schedule.actual_started_at,
            'actual_ended_at': schedule.actual_ended_at,
            'special_notes': schedule.special_notes,
            **GuideTripService.attendance_summary(schedule),
        } for schedule in schedules]
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class GuideScheduleParticipantsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsGuide]

    def get(self, request, schedule_id):
        schedule = GuideTripService.get_assigned_schedule(request.user.id, schedule_id)
        if not schedule:
            return Response({'status': 'error', 'message': 'Không tìm thấy chuyến được phân công.'}, status=status.HTTP_404_NOT_FOUND)
        participants = GuideTripService.get_participants(schedule)
        return Response({
            'status': 'success',
            'schedule': {
                'id': schedule.id,
                'tour_title': schedule.tour.title,
                'departure_date': schedule.departure_date,
                'status': schedule.status,
                'booked_count': schedule.booked_count,
            },
            'total': participants.count(),
            'data': TourParticipantSerializer(participants, many=True).data,
        }, status=status.HTTP_200_OK)

    def patch(self, request, schedule_id, participant_id):
        schedule = GuideTripService.get_assigned_schedule(request.user.id, schedule_id)
        if not schedule:
            return Response({'status': 'error', 'message': 'Không tìm thấy chuyến được phân công.'}, status=status.HTTP_404_NOT_FOUND)
        if schedule.status in {'completed', 'cancelled', 'canceled'}:
            return Response({'message': 'Chuyến đã kết thúc hoặc hủy; không thể sửa hồ sơ.'}, status=409)
        serializer = TourParticipantUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data:
            return Response({'status': 'error', 'message': 'Không có thông tin cần cập nhật.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            participant = GuideTripService.update_participant(
                schedule, participant_id, serializer.validated_data,
            )
        except ValueError as exc:
            return Response({'message': str(exc)}, status=409)
        if not participant:
            return Response({'status': 'error', 'message': 'Không tìm thấy thành viên trong chuyến này.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'status': 'success',
            'data': TourParticipantSerializer(participant).data,
        }, status=status.HTTP_200_OK)


class GuideAttendanceCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsGuide]

    def post(self, request, schedule_id):
        schedule = GuideTripService.get_assigned_schedule(request.user.id, schedule_id)
        if not schedule:
            return Response({'status': 'error', 'message': 'Không tìm thấy chuyến được phân công.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AttendanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guide = Guides.objects.filter(user_id=request.user.id).first()
        if not guide:
            return Response({'status': 'error', 'message': 'Tài khoản chưa có hồ sơ hướng dẫn viên.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            log = GuideTripService.record_attendance(schedule, guide, serializer.validated_data)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'status': 'success',
            'data': {
                'id': log.id,
                'participant_id': log.participant_id,
                'attendance_stage': log.attendance_stage,
                'participant_status': log.participant_status,
                'checkpoint_id': log.checkpoint_id,
                'confirmed_by_guide_id': log.confirmed_by_guide_id,
                'confirmed_at': log.confirmed_at,
                'note': log.note,
            },
        }, status=status.HTTP_201_CREATED)


class GuideTripStartView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsGuide]

    def post(self, request, schedule_id):
        schedule, outcome = GuideTripService.start_trip(request.user.id, schedule_id)
        if outcome == 'not_found':
            return Response({'status': 'error', 'message': 'Không tìm thấy chuyến được phân công.'}, status=status.HTTP_404_NOT_FOUND)
        if outcome == 'invalid_status':
            return Response({'status': 'error', 'message': 'Không thể bắt đầu chuyến đã hủy hoặc hoàn tất.'}, status=status.HTTP_409_CONFLICT)
        if outcome == 'incomplete_attendance':
            return Response({'message': 'Cần điểm danh toàn bộ danh sách và có ít nhất một người tham gia trước khi xuất phát.'}, status=409)
        return Response({
            'status': 'success',
            'message': 'Chuyến đã được bắt đầu.' if outcome == 'started' else 'Chuyến đã bắt đầu trước đó.',
            'data': {'id': schedule.id, 'status': schedule.status, 'actual_started_at': schedule.actual_started_at},
        }, status=status.HTTP_200_OK)


class GuideTripFinishView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsGuide]

    def post(self, request, schedule_id):
        report = request.data.get('trip_report', '')
        if not isinstance(report, str):
            return Response({'status': 'error', 'message': "'trip_report' phải là chuỗi."}, status=status.HTTP_400_BAD_REQUEST)
        schedule, outcome, unresolved = GuideTripService.finish_trip(request.user.id, schedule_id, report)
        if outcome == 'not_found':
            return Response({'status': 'error', 'message': 'Không tìm thấy chuyến được phân công.'}, status=status.HTTP_404_NOT_FOUND)
        if outcome == 'not_in_progress':
            return Response({'status': 'error', 'message': 'Chỉ có thể kết thúc chuyến đang diễn ra.'}, status=status.HTTP_409_CONFLICT)
        if outcome == 'unresolved_participants':
            return Response({
                'status': 'error',
                'message': 'Cần xác nhận tình trạng về hoặc không tham gia của toàn bộ thành viên trước khi kết thúc chuyến.',
                'unresolved_participant_ids': unresolved,
            }, status=status.HTTP_409_CONFLICT)
        return Response({
            'status': 'success',
            'message': 'Đã kết thúc chuyến và lưu báo cáo.',
            'data': {
                'id': schedule.id,
                'status': schedule.status,
                'actual_started_at': schedule.actual_started_at,
                'actual_ended_at': schedule.actual_ended_at,
                'trip_report': schedule.trip_report,
            },
        }, status=status.HTTP_200_OK)
