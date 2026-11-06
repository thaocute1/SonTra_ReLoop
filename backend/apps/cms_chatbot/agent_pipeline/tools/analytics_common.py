"""Small, dependency-free helpers shared by analytics adapters/projections."""
from datetime import date, datetime
from decimal import Decimal
import re

from ..core import AgentPipelineError

MAX_ROWS = 100
ALLOWED_GROUPS = {"day", "week", "month", "tour", "status"}


def validate_report_args(args, allowed=None):
    allowed = allowed or {"from", "to", "group_by", "status", "top_n"}
    if not isinstance(args, dict) or set(args) - allowed:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "Invalid analytics arguments.", 400)
    if "group_by" in args and args["group_by"] not in ALLOWED_GROUPS:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "group_by is invalid.", 400)
    if "top_n" in args and (isinstance(args["top_n"], bool) or not isinstance(args["top_n"], int) or not 1 <= args["top_n"] <= MAX_ROWS):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "top_n must be between 1 and 100.", 400)
    for key in ("from", "to"):
        if key in args and (not isinstance(args[key], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args[key])):
            raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", f"{key} must be YYYY-MM-DD.", 400)
    if args.get("from") and args.get("to") and args["from"] > args["to"]:
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "from must not be after to.", 400)
    return args


def json_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): json_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_value(v) for v in value]
    return value


def rows_dataset(description, rows, columns=None, source="report"):
    rows = [json_value(row) for row in rows[:MAX_ROWS]]
    if columns is None:
        names = list(rows[0]) if rows else []
        columns = [{"name": name, "label": name, "type": "number" if isinstance(rows[0].get(name), (int, float)) else "string"} for name in names]
    return {"source": source, "description": description, "columns": columns, "rows": rows}


def redact(value):
    """Remove secrets and direct identifiers before data reaches a provider."""
    if isinstance(value, dict):
        blocked = {"token", "approval_token", "password", "email", "phone", "customer_id", "raw_sql", "stack_trace"}
        return {k: redact(v) for k, v in value.items() if k.lower() not in blocked}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return json_value(value)
