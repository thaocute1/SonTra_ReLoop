import json
import re
from typing import Any


VALID_CHART_TYPES = frozenset(
    {"bar", "line", "pie", "area", "column", "doughnut", "radar", "scatter"}
)

CHART_RESPONSE_SCHEMA_INSTRUCTION = (
    "\n\nĐỊNH DẠNG PHẢN HỒI (RESPONSE SCHEMA):"
    "\nBạn có thể trả lời bằng văn bản thuần túy hoặc cấu trúc JSON có chứa biểu đồ/dữ liệu trực quan khi phù hợp."
    "\nKhi cần trình bày dữ liệu dạng biểu đồ (chart), hãy trả về một đối tượng JSON duy nhất có trường 'parts' với cấu trúc sau:"
    "\n{"
    '\n  "parts": ['
    '\n    {"type": "text", "text": "Phần nhận xét xu hướng, đánh giá sự thay đổi và tóm tắt tổng quan súc tích (không vẽ bảng hay liệt kê lại từng dòng số liệu)..." },'
    '\n    {'
    '\n      "type": "chart",'
    '\n      "chart": {'
    '\n        "type": "bar",'  # hoặc "line", "pie", "area"
    '\n        "title": "Tiêu đề biểu đồ",'
    '\n        "description": "Mô tả hoặc đơn vị (ví dụ: Đơn vị: VND)",'
    '\n        "xField": "tên trường trục hoành (ví dụ: label)",'
    '\n        "series": ['
    '\n          {'
    '\n            "field": "tên trường giá trị (ví dụ: revenue)",'
    '\n            "name": "Tên hiển thị (ví dụ: Doanh thu)",'
    '\n            "type": "bar"'
    '\n          }'
    '\n        ],'
    '\n        "data": ['
    '\n          {"label": "Tháng 1", "revenue": 1000000},'
    '\n          {"label": "Tháng 2", "revenue": 1500000}'
    '\n        ]'
    '\n      }'
    '\n    }'
    '\n  ]'
    "\n}"
    "\nLưu ý: Chỉ trực quan hóa dữ liệu có thật từ tin nhắn của người dùng hoặc kết quả từ công cụ (tools)."
)


def validate_and_normalize_chart(chart_obj: Any) -> dict[str, Any] | None:
    """Validate and normalize a chart object against the chart schema.

    Returns a dict strictly conforming to:
    {
        "type": str,
        "title": str,
        "description": str,
        "xField": str,
        "series": list[{"field": str, "name": str, "type": str}],
        "data": list[dict],
    }
    or None if invalid.
    """
    if not isinstance(chart_obj, dict):
        return None

    raw_type = str(chart_obj.get("type", "bar")).strip().lower()
    chart_type = raw_type if raw_type in VALID_CHART_TYPES else "bar"

    title = str(chart_obj.get("title", "")).strip()
    description = str(chart_obj.get("description", "")).strip()

    # Validate data
    raw_data = chart_obj.get("data")
    if not isinstance(raw_data, list):
        data = []
    else:
        data = [item for item in raw_data if isinstance(item, dict)]

    # Validate xField
    raw_x_field = chart_obj.get("xField")
    if isinstance(raw_x_field, str) and raw_x_field.strip():
        x_field = raw_x_field.strip()
    elif data:
        # Infer candidate from common keys or first non-numeric key in data[0]
        keys = list(data[0].keys())
        preferred = [k for k in keys if k.lower() in ("label", "date", "month", "time", "name", "category", "x")]
        if preferred:
            x_field = preferred[0]
        else:
            non_numeric = [k for k in keys if not isinstance(data[0][k], (int, float))]
            x_field = non_numeric[0] if non_numeric else keys[0]
    else:
        x_field = "label"

    # Validate series
    raw_series = chart_obj.get("series")
    series: list[dict[str, Any]] = []
    if isinstance(raw_series, list):
        for s in raw_series:
            if isinstance(s, dict):
                field = str(s.get("field", "")).strip()
                name = str(s.get("name") or field).strip()
                s_type = str(s.get("type") or chart_type).strip().lower()
                if not s_type or s_type not in VALID_CHART_TYPES:
                    s_type = chart_type
                if field:
                    series.append({"field": field, "name": name, "type": s_type})

    # If series is empty, attempt to infer from data
    if not series and data:
        numeric_keys = [
            k for k, v in data[0].items()
            if k != x_field and isinstance(v, (int, float))
        ]
        for key in numeric_keys:
            series.append({"field": key, "name": key, "type": chart_type})

    if not series:
        series.append({"field": "value", "name": "Giá trị", "type": chart_type})

    return {
        "type": chart_type,
        "title": title,
        "description": description,
        "xField": x_field,
        "series": series,
        "data": data,
    }


def validate_and_normalize_part(part: Any) -> dict[str, Any] | None:
    """Validate and normalize an individual message part."""
    if not isinstance(part, dict):
        return None

    part_type = str(part.get("type", "")).strip().lower()

    if part_type == "text" or ("text" in part and "chart" not in part):
        text_val = str(part.get("text", "")).strip()
        if text_val:
            return {"type": "text", "text": text_val}
        return None

    if part_type == "chart" or "chart" in part:
        if "chart" in part and not isinstance(part["chart"], dict):
            return None
        raw_chart = part.get("chart") if isinstance(part.get("chart"), dict) else part
        normalized_chart = validate_and_normalize_chart(raw_chart)
        if normalized_chart is not None:
            return {"type": "chart", "chart": normalized_chart}
        return None

    return None


def parse_and_validate_response(content: str) -> tuple[list[dict[str, Any]], str]:
    """Parse model response content and guarantee that the result conforms to the schema.

    Returns:
        (parts, answer_text)
        where parts is a list of {"type": "text", "text": ...} or {"type": "chart", "chart": ...}
        and answer_text is a plain text representation.
    """
    if not content or not content.strip():
        return [{"type": "text", "text": ""}], ""

    raw_text = content.strip()

    # Try extracting JSON and surrounding text
    extracted_json = None
    leading_text = ""
    trailing_text = ""

    # Check for markdown code fences: ```json ... ``` or ``` ... ```
    fence_pattern = re.compile(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", re.IGNORECASE)
    match = fence_pattern.search(raw_text)

    if match:
        json_str = match.group(1).strip()
        leading_text = raw_text[:match.start()].strip()
        trailing_text = raw_text[match.end():].strip()
        try:
            extracted_json = json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            extracted_json = None

    if extracted_json is None:
        # Check if the whole string is JSON
        if raw_text.startswith("{") and raw_text.endswith("}"):
            try:
                extracted_json = json.loads(raw_text)
            except (json.JSONDecodeError, ValueError):
                extracted_json = None

    if extracted_json is None:
        # Try finding the first '{' and last '}'
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end > start:
            candidate = raw_text[start : end + 1]
            try:
                extracted_json = json.loads(candidate)
                leading_text = raw_text[:start].strip()
                trailing_text = raw_text[end + 1 :].strip()
            except (json.JSONDecodeError, ValueError):
                extracted_json = None

    parts: list[dict[str, Any]] = []

    if isinstance(extracted_json, dict):
        raw_parts = extracted_json.get("parts")
        if isinstance(raw_parts, list):
            for p in raw_parts:
                norm = validate_and_normalize_part(p)
                if norm:
                    parts.append(norm)
        elif "chart" in extracted_json:
            if "text" in extracted_json or "answer" in extracted_json:
                txt = str(extracted_json.get("text") or extracted_json.get("answer", "")).strip()
                if txt:
                    parts.append({"type": "text", "text": txt})
            norm_chart = validate_and_normalize_chart(extracted_json["chart"])
            if norm_chart:
                parts.append({"type": "chart", "chart": norm_chart})
        elif "series" in extracted_json and "data" in extracted_json:
            # Chart object given at top-level
            norm_chart = validate_and_normalize_chart(extracted_json)
            if norm_chart:
                parts.append({"type": "chart", "chart": norm_chart})
        elif "text" in extracted_json or "answer" in extracted_json:
            txt = str(extracted_json.get("text") or extracted_json.get("answer", "")).strip()
            if txt:
                parts.append({"type": "text", "text": txt})

        # Add leading or trailing text if not already present
        if leading_text:
            # Check if leading text is already part of the first text part
            first_text = parts[0]["text"] if parts and parts[0]["type"] == "text" else ""
            if leading_text not in first_text:
                parts.insert(0, {"type": "text", "text": leading_text})

        if trailing_text:
            last_text = parts[-1]["text"] if parts and parts[-1]["type"] == "text" else ""
            if trailing_text not in last_text:
                parts.append({"type": "text", "text": trailing_text})

    # If no valid parts could be extracted, treat the whole content as plain text
    if not parts:
        parts = [{"type": "text", "text": raw_text}]

    # Determine answer text representation
    text_pieces = [p["text"] for p in parts if p["type"] == "text"]
    if text_pieces:
        answer = "\n\n".join(text_pieces)
    else:
        # If only chart parts exist, use the chart's title or default description
        first_chart = parts[0]["chart"]
        answer = first_chart.get("title") or first_chart.get("description") or "Biểu đồ dữ liệu"

    return parts, answer
