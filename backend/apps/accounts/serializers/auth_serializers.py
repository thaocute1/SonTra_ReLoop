from rest_framework import serializers
from ..models.user_models import Users

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


import re
from django.utils import timezone

class UserProfileSerializer(serializers.ModelSerializer):
    emergency_contact_name = serializers.SerializerMethodField()
    emergency_contact_phone = serializers.SerializerMethodField()
    medical_notes = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = [
            'id', 'auth_id', 'name', 'email', 'phone',
            'avatar_url', 'qr_token', 'total_eco_points', 'role',
            'status', 'created_at', 'raw_user_meta_data',
            'date_of_birth', 'height_cm', 'weight_kg', 'fitness_level',
            'emergency_contact_name', 'emergency_contact_phone',
            'medical_notes'
        ]

    def get_emergency_contact_name(self, obj):
        return (obj.raw_user_meta_data or {}).get('emergency_contact_name', '')

    def get_emergency_contact_phone(self, obj):
        return (obj.raw_user_meta_data or {}).get('emergency_contact_phone', '')

    def get_medical_notes(self, obj):
        return (obj.raw_user_meta_data or {}).get('medical_notes', '')


class UserProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    avatar_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    height_cm = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    weight_kg = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    fitness_level = serializers.ChoiceField(
        choices=['fit', 'normal', 'low_fitness'], required=False, allow_null=True, allow_blank=True
    )

    # Metadata fields
    emergency_contact_name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    emergency_contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    medical_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)

    def validate_date_of_birth(self, value):
        if value is not None and value > timezone.localdate():
            raise serializers.ValidationError('Ngày sinh không thể ở tương lai.')
        return value

    def validate_height_cm(self, value):
        if value is not None and not (0 < value <= 300):
            raise serializers.ValidationError('Chiều cao phải lớn hơn 0 và không quá 300 cm.')
        return value

    def validate_weight_kg(self, value):
        if value is not None and not (0 < value <= 500):
            raise serializers.ValidationError('Cân nặng phải lớn hơn 0 và không quá 500 kg.')
        return value

    # Password fields
    old_password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    new_password = serializers.CharField(required=False, allow_blank=True, min_length=6, write_only=True)

    def validate_phone(self, value):
        if value:
            cleaned = re.sub(r'[\s\-\.\(\)]', '', value)
            if not re.match(r'^\+?[0-9]{9,15}$', cleaned):
                raise serializers.ValidationError("Số điện thoại không hợp lệ (cần từ 9 đến 15 chữ số).")
            user = self.context.get('user')
            if user:
                qs = Users.objects.filter(phone=value).exclude(id=user.id)
                if qs.exists():
                    raise serializers.ValidationError("Số điện thoại này đã được sử dụng bởi tài khoản khác.")
        return value

    def validate_emergency_contact_phone(self, value):
        if value:
            cleaned = re.sub(r'[\s\-\.\(\)]', '', value)
            if not re.match(r'^\+?[0-9]{9,15}$', cleaned):
                raise serializers.ValidationError("Số điện thoại liên hệ khẩn cấp không hợp lệ.")
        return value

    def validate(self, attrs):
        user = self.context.get('user')
        old_password = attrs.get('old_password')
        new_password = attrs.get('new_password')

        if new_password:
            if not old_password:
                raise serializers.ValidationError({"old_password": "Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới."})
            if user and not user.check_password(old_password):
                raise serializers.ValidationError({"old_password": "Mật khẩu hiện tại không chính xác."})
        return attrs

