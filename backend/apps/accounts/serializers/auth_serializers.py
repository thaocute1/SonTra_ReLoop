from rest_framework import serializers
from apps.accounts.models.user_models import Users

class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    full_name = serializers.CharField(max_length=255, required=False)
    username = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    user_type = serializers.CharField(max_length=50, required=False, default='customer')
    role = serializers.CharField(max_length=50, required=False, default='customer')

    def validate(self, attrs):
        # Allow name from 'name' or 'full_name' or 'username'
        resolved_name = attrs.get('name') or attrs.get('full_name') or attrs.get('username') or attrs['email'].split('@')[0]
        attrs['name'] = resolved_name
        attrs['role'] = attrs.get('role') or attrs.get('user_type') or 'customer'
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SocialOAuthSerializer(serializers.Serializer):
    token = serializers.CharField()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = [
            'id', 'auth_id', 'name', 'email', 'phone',
            'avatar_url', 'total_eco_points', 'role',
            'status', 'created_at'
        ]
