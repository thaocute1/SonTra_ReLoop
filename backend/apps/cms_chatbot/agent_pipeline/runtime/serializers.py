import re

from rest_framework import serializers


SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class AgentChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=1, max_length=4000, trim_whitespace=True)
    conversation_id = serializers.CharField(min_length=1, max_length=128, required=False, allow_null=True)
    session_id = serializers.CharField(min_length=1, max_length=128, required=False)
    context = serializers.DictField(required=False)
    data = serializers.DictField(required=False, allow_null=True)
    response_options = serializers.DictField(required=False)
    max_loops = serializers.IntegerField(min_value=1, max_value=3, default=3)

    def validate(self, attrs):
        attrs["session_id"] = attrs.get("session_id") or attrs.get("conversation_id")
        if not attrs["session_id"]:
            raise serializers.ValidationError({"session_id": "session_id or conversation_id is required."})
        dataset = attrs.get("data")
        if dataset is not None:
            if dataset.get("source") is None or not isinstance(dataset.get("columns"), list) or not isinstance(dataset.get("rows"), list):
                raise serializers.ValidationError({"data": "data requires source, columns and rows."})
            names = {column.get("name") for column in dataset["columns"] if isinstance(column, dict)}
            if any(not isinstance(row, dict) or not set(row).issubset(names) for row in dataset["rows"]):
                raise serializers.ValidationError({"data": "data rows must match declared columns."})
        return attrs

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
