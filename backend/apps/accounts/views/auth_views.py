from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q

from common.permissions import IsSystemAdmin
from ..services.auth_service import AuthService
from ..services.token_service import TokenService
from ..repositories.user_repository import UserRepository
from ..serializers.auth_serializers import (
    RegisterSerializer, LoginSerializer, SocialOAuthSerializer,
    TokenRefreshSerializer, ForgotPasswordSerializer,
    UserProfileSerializer, UserProfileUpdateSerializer
)
from ..models.user_models import Users

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        result = AuthService.register(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            phone=validated_data.get('phone'),
            role='customer'
        )
        return Response(result, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        result = AuthService.login(
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


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = TokenService.refresh_access_token(serializer.validated_data['refresh'])
        return Response(result, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        user = UserRepository.get_by_email(email)
        if user:
            send_mail(
                subject='Sơn Trà REloop - Hướng dẫn khôi phục mật khẩu',
                message=(
                    f'Xin chào {user.name or email},\n\n'
                    'Hệ thống đã ghi nhận yêu cầu đặt lại mật khẩu cho tài khoản của bạn. '
                    'Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.'
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@sontrareloop.vn'),
                recipient_list=[email],
                fail_silently=True,
            )

        return Response({
            'message': 'Đã ghi nhận yêu cầu. Hãy kiểm tra hộp thư của bạn để tiếp tục.'
        }, status=status.HTTP_200_OK)


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
        for field in ['date_of_birth', 'height_cm', 'weight_kg', 'fitness_level']:
            if field in data:
                setattr(user, field, data[field] or None)

        # Update metadata
        meta = user.raw_user_meta_data or {}
        if not isinstance(meta, dict):
            meta = {}

        for meta_field in ['emergency_contact_name', 'emergency_contact_phone', 'medical_notes']:
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
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get(self, request):
        role = request.query_params.get('role', 'all')
        status_param = request.query_params.get('status', 'all')
        search = request.query_params.get('search', '')

        qs = Users.objects.filter(deleted_at__isnull=True).order_by('-id')

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

        active_users = Users.objects.filter(deleted_at__isnull=True)
        return Response({
            'count': len(results),
            'total_users': active_users.count(),
            'total_customers': active_users.filter(role='customer').count(),
            'total_vendors': active_users.filter(role='vendor_admin').count(),
            'total_staffs': active_users.filter(role__in=['staff', 'system_admin']).count(),
            'results': results
        }, status=status.HTTP_200_OK)


class AdminUserToggleStatusView(APIView):
    """
    POST /api/v1/accounts/users/<int:pk>/toggle-status/
    AD-02: Khóa hoặc Mở khóa tài khoản người dùng
    """
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request, pk):
        try:
            user = Users.objects.get(id=pk)
        except Users.DoesNotExist:
            return Response({'error': 'Không tìm thấy người dùng.'}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response({'error': 'Không thể tự khóa tài khoản quản trị đang đăng nhập.'}, status=status.HTTP_400_BAD_REQUEST)

        new_status = 'locked' if user.status == 'active' else 'active'
        user.status = new_status
        user.save(update_fields=['status'])

        status_text = 'ĐÃ KHÓA' if new_status == 'locked' else 'ĐÃ MỞ KHÓA'
        return Response({
            'success': True,
            'message': f'{status_text} tài khoản {user.email} thành công!',
            'new_status': new_status
        }, status=status.HTTP_200_OK)
