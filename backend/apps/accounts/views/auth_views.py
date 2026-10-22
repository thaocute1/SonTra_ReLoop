from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from ..serializers.auth_serializers import (
    RegisterSerializer, LoginSerializer, SocialOAuthSerializer, UserProfileSerializer,
    UserProfileUpdateSerializer
)
from ..services.auth_service import AuthService

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = AuthService.register(
            name=data['name'],
            email=data['email'],
            password=data['password'],
            phone=data.get('phone'),
            role=data.get('role', 'customer')
        )
        return Response(result, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = AuthService.login(
            email=data['email'],
            password=data['password']
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
