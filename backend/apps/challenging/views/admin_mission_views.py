from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..services.admin_mission_service import AdminMissionService


def _is_bql(request):
    return (
        request.user
        and request.user.is_authenticated
        and getattr(request.user, 'role', '') in ('staff', 'system_admin', 'admin')
    )


class AdminMissionListCreateView(APIView):
    """
    GET  /api/v1/challenging/missions/admin/
    POST /api/v1/challenging/missions/admin/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_bql(request):
            return Response({'detail': 'Chỉ BQL mới có quyền quản lý nhiệm vụ xanh.'}, status=status.HTTP_403_FORBIDDEN)
        data = AdminMissionService.list_missions_and_options()
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)

    def post(self, request):
        if not _is_bql(request):
            return Response({'detail': 'Chỉ BQL mới có quyền tạo nhiệm vụ xanh.'}, status=status.HTTP_403_FORBIDDEN)
        mission = AdminMissionService.create_mission(request.data, actor=request.user)
        return Response({
            'status': 'success',
            'message': f'Đã tạo nhiệm vụ xanh "{mission["title"]}" thành công.',
            'data': mission,
        }, status=status.HTTP_201_CREATED)


class AdminMissionDetailView(APIView):
    """
    PATCH  /api/v1/challenging/missions/admin/<int:pk>/
    DELETE /api/v1/challenging/missions/admin/<int:pk>/
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not _is_bql(request):
            return Response({'detail': 'Chỉ BQL mới có quyền chỉnh sửa nhiệm vụ xanh.'}, status=status.HTTP_403_FORBIDDEN)
        mission = AdminMissionService.update_mission(pk, request.data)
        return Response({
            'status': 'success',
            'message': 'Đã cập nhật nhiệm vụ xanh.',
            'data': mission,
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        if not _is_bql(request):
            return Response({'detail': 'Chỉ BQL mới có quyền xóa nhiệm vụ xanh.'}, status=status.HTTP_403_FORBIDDEN)
        AdminMissionService.delete_mission(pk)
        return Response({
            'status': 'success',
            'message': 'Đã gỡ nhiệm vụ xanh khỏi hệ thống.',
        }, status=status.HTTP_200_OK)
