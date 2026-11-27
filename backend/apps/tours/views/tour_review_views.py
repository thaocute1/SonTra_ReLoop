from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from common.pagination import StandardResultsSetPagination
from common.permissions import IsBQL
from ..serializers.tour_review_serializers import (
    AdminTourListSerializer, TourReviewInputSerializer, TourReviewQuerySerializer,
)
from ..services.tour_review_service import TourReviewService
from ..services.customer_review_admin_service import CustomerReviewAdminService


class AdminTourReviewQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def get(self, request):
        query = TourReviewQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        tours, metrics = TourReviewService.queue(**query.validated_data)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(tours, request, view=self)
        response = paginator.get_paginated_response(AdminTourListSerializer(page, many=True).data)
        response.data['metrics'] = metrics
        return response


class AdminTourReviewDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def get(self, request, pk):
        return Response({'status': 'success', 'data': TourReviewService.detail(pk)})


class AdminTourReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def post(self, request, pk):
        serializer = TourReviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = TourReviewService.review(pk, request.user, **serializer.validated_data)
        message = 'Đã phê duyệt và xuất bản tour.' if data['status'] == 'published' else 'Đã từ chối tour và thông báo cho đối tác.'
        return Response({'status': 'success', 'message': message, 'data': data})


class AdminCustomerReviewsListView(APIView):
    """
    GET /api/v1/tours/admin/customer-reviews/
    BQL xem danh sách đánh giá khách hàng, hàng đợi chờ duyệt, đánh giá bị báo cáo & cảnh báo chất lượng.
    """
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def get(self, request):
        data = CustomerReviewAdminService.list_reviews(
            tab=request.query_params.get('tab', 'all'),
            vendor_id=request.query_params.get('vendor_id'),
            tour_id=request.query_params.get('tour_id'),
            rating=request.query_params.get('rating'),
            search=request.query_params.get('search', ''),
        )
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class AdminCustomerReviewModerateView(APIView):
    """
    POST /api/v1/tours/admin/customer-reviews/<int:review_id>/moderate/
    BQL phê duyệt, ẩn/từ chối đánh giá hoặc bỏ qua báo cáo vi phạm.
    """
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def post(self, request, review_id):
        action = request.data.get('action')
        note = request.data.get('note') or request.data.get('reason') or ''
        data = CustomerReviewAdminService.moderate_review(
            review_id=review_id,
            actor=request.user,
            action=action,
            note=note,
        )
        messages = {
            'approve': 'Đã phê duyệt hiển thị đánh giá.',
            'reject': 'Đã ẩn đánh giá và cập nhật lại điểm trung bình.',
            'dismiss_reports': 'Đã bỏ qua báo cáo và giữ nguyên đánh giá.',
        }
        return Response({
            'status': 'success',
            'message': messages.get(str(action or '').strip().lower(), 'Đã cập nhật kiểm duyệt đánh giá.'),
            'data': data,
        }, status=status.HTTP_200_OK)
