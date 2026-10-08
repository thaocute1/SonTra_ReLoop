from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from ..serializers.staff_serializers import StaffCreateSerializer, StaffListSerializer
from ..services.staff_service import StaffService

class StaffManagementView(APIView):
    """
    API View to list existing BQL staff accounts and create a new Staff account.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        staffs = StaffService.get_all_staffs()
        serializer = StaffListSerializer(staffs, many=True)
        return Response({
            "status": "success",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            creator = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
            staff = StaffService.create_staff(serializer.validated_data, creator_user=creator)
            res_serializer = StaffListSerializer(staff)
            return Response({
                "status": "success",
                "message": "Tài khoản nhân viên BQL đã được tạo thành công trên hệ thống.",
                "data": res_serializer.data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi khi lưu vào CSDL: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
