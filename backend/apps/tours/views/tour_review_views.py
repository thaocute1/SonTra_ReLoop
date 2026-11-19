from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from common.pagination import StandardResultsSetPagination
from common.permissions import IsBQL
from ..serializers.tour_review_serializers import (
    AdminTourListSerializer, TourReviewInputSerializer, TourReviewQuerySerializer,
)
from ..services.tour_review_service import TourReviewService


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
