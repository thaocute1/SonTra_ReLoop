from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.accounts.serializers.auth_serializers import (
    RegisterSerializer, LoginSerializer, SocialOAuthSerializer, UserProfileSerializer
)
from apps.accounts.services.auth_service import AuthService

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
