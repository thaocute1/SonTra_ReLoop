from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q

from ..services.auth_service import AuthService
from ..serializers.auth_serializers import (
    RegisterSerializer, LoginSerializer, SocialOAuthSerializer,
    UserProfileSerializer, UserProfileUpdateSerializer
)
from ..models.user_models import Users

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        result = AuthService.register_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            phone=validated_data.get('phone'),
            role=validated_data.get('role', 'customer')
        )
        return Response(result, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        result = AuthService.login_user(
            email=validated_data['email'],
            password=validated_data['password']
        )
        return Response(result, status=status.HTTP_200_OK)


class GoogleOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SocialOAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        result = AuthService.login_with_google(token)
        return Response(result, status=status.HTTP_200_OK)


class FacebookOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SocialOAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        result = AuthService.login_with_facebook(token)
        return Response(result, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(data=request.data, context={'user': request.user})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user

        # Update direct fields
        if 'name' in data and data['name']:
            user.name = data['name']
        if 'phone' in data:
            user.phone = data['phone'] or None
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']

        # Update metadata
        meta = user.raw_user_meta_data or {}
        if not isinstance(meta, dict):
            meta = {}

        for meta_field in ['emergency_contact_name', 'emergency_contact_phone', 'medical_notes', 'fitness_level']:
            if meta_field in data:
                meta[meta_field] = data[meta_field]
        user.raw_user_meta_data = meta

        # Update password if provided
        if data.get('new_password'):
            user.set_password(data['new_password'])

        user.save()

        profile_serializer = UserProfileSerializer(user)
        return Response({
            'message': 'Cập nhật hồ sơ thành công!',
            'user': profile_serializer.data
        }, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    """
    GET /api/v1/accounts/users/
    AD-02: Quản lý người dùng - Danh sách tài khoản khách hàng, vendor và staff
    """
    permission_classes = [AllowAny]

    def get(self, request):
        role = request.query_params.get('role', 'all')
        status_param = request.query_params.get('status', 'all')
        search = request.query_params.get('search', '')

        qs = Users.objects.all().order_by('-id')

        if role != 'all':
            if role == 'customer':
                qs = qs.filter(role='customer')
            elif role in ['vendor', 'vendor_admin']:
                qs = qs.filter(role='vendor_admin')
            elif role in ['staff', 'system_admin']:
                qs = qs.filter(role__in=['staff', 'system_admin'])
        
        if status_param != 'all':
            qs = qs.filter(status=status_param)

        if search:
            qs = qs.filter(
                Q(name__icontains=search) | 
                Q(email__icontains=search) | 
                Q(phone__icontains=search)
            )

        results = []
        for u in qs[:100]:
            results.append({
                'id': u.id,
                'name': u.name or u.email.split('@')[0],
                'email': u.email or '',
                'phone': u.phone or '',
                'role': u.role,
                'role_label': {
                    'customer': 'Du Khách Sinh Thái',
                    'vendor': 'Đơn Vị Lữ Hành (Vendor)',
                    'vendor_admin': 'Quản Trị Vendor',
                    'staff': 'Cán Bộ BQL Thực Địa',
                    'system_admin': 'Quản Trị BQL'
                }.get(u.role, u.role),
                'status': u.status or 'active',
                'total_eco_points': u.total_eco_points or 0,
                'avatar_url': u.avatar_url or '',
                'created_at': u.created_at.strftime('%d/%m/%Y') if u.created_at else 'Chưa ghi nhận'
            })

        return Response({
            'count': len(results),
            'total_users': Users.objects.count(),
            'total_customers': Users.objects.filter(role='customer').count(),
            'total_vendors': Users.objects.filter(role='vendor_admin').count(),
            'total_staffs': Users.objects.filter(role__in=['staff', 'system_admin']).count(),
            'results': results
        }, status=status.HTTP_200_OK)


class AdminUserToggleStatusView(APIView):
    """
    POST /api/v1/accounts/users/<int:pk>/toggle-status/
    AD-02: Khóa hoặc Mở khóa tài khoản người dùng
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            user = Users.objects.get(id=pk)
        except Users.DoesNotExist:
            return Response({'error': 'Không tìm thấy người dùng.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = 'locked' if user.status == 'active' else 'active'
        user.status = new_status
        user.save(update_fields=['status'])

        status_text = 'ĐÃ KHÓA' if new_status == 'locked' else 'ĐÃ MỞ KHÓA'
        return Response({
            'success': True,
            'message': f'{status_text} tài khoản {user.email} thành công!',
            'new_status': new_status
        }, status=status.HTTP_200_OK)
