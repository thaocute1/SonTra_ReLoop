import re

from rest_framework import serializers


SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class AgentChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=1, max_length=4000, trim_whitespace=True)
    session_id = serializers.CharField(min_length=1, max_length=128)
    max_loops = serializers.IntegerField(min_value=1, max_value=3, default=3)

    def validate_session_id(self, value: str) -> str:
        if not SESSION_ID_PATTERN.fullmatch(value):
            raise serializers.ValidationError("session_id contains invalid characters.")
        return value

    def to_internal_value(self, data):
        if isinstance(data, dict):
            unexpected = set(data) - set(self.fields)
            if unexpected:
                raise serializers.ValidationError(
                    {"unexpected_fields": sorted(unexpected)}
                )
        return super().to_internal_value(data)
