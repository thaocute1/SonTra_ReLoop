import json
import os
import socket
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from ..core import AgentPipelineError, ModelTurn, ToolCall


MAX_PROVIDER_TIMEOUT = 120
MAX_PROVIDER_RESPONSE_BYTES = 1_000_000
DEFAULT_MAX_OUTPUT_TOKENS = 1024
MAX_OUTPUT_TOKENS = 2048


class _RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return None


def _safe_urlopen(request: Request, timeout: float):
    return build_opener(_RejectRedirects()).open(request, timeout=timeout)


def normalize_deepseek_response(
    payload: Any, model: str = "deepseek-chat"
) -> ModelTurn:
    try:
        message = payload["choices"][0]["message"]
    except (KeyError, IndexError, TypeError):
        raise AgentPipelineError(
            "INVALID_PROVIDER_RESPONSE", "DeepSeek returned an invalid response."
        ) from None

    if not isinstance(message, dict):
        raise AgentPipelineError(
            "INVALID_PROVIDER_RESPONSE", "DeepSeek returned an invalid response."
        )

    content = message.get("content")
    if content is not None and not isinstance(content, str):
        raise AgentPipelineError(
            "INVALID_PROVIDER_RESPONSE", "DeepSeek returned an invalid response."
        )

    raw_calls = message.get("tool_calls") or []
    if not isinstance(raw_calls, list):
        raise AgentPipelineError(
            "INVALID_PROVIDER_RESPONSE", "DeepSeek returned invalid tool calls."
        )

    tool_calls: list[ToolCall] = []
    for raw_call in raw_calls:
        if not isinstance(raw_call, dict):
            raise AgentPipelineError(
                "MALFORMED_TOOL_CALL", "DeepSeek returned an invalid tool call."
            )
        function = raw_call.get("function")
        call_id = raw_call.get("id")
        if not isinstance(function, dict) or not isinstance(call_id, str) or not call_id:
            raise AgentPipelineError(
                "MALFORMED_TOOL_CALL", "DeepSeek returned an invalid tool call."
            )
        name = function.get("name")
        raw_arguments = function.get("arguments")
        if not isinstance(name, str) or not isinstance(raw_arguments, str):
            raise AgentPipelineError(
                "MALFORMED_TOOL_CALL", "DeepSeek returned an invalid tool call."
            )
        try:
            arguments = json.loads(raw_arguments)
        except json.JSONDecodeError as error:
            raise AgentPipelineError(
                "MALFORMED_TOOL_CALL", "DeepSeek returned invalid tool-call JSON."
            ) from error
        if not isinstance(arguments, dict):
            raise AgentPipelineError(
                "MALFORMED_TOOL_CALL", "DeepSeek returned invalid tool-call arguments."
            )
        tool_calls.append(ToolCall(id=call_id, name=name, arguments=arguments))

    return ModelTurn(
        provider="deepseek", content=content, tool_calls=tool_calls, model=model
    )


class DeepSeekProvider:
    name = "deepseek"

    def __init__(self) -> None:
        self.api_key = os.getenv("AI_AGENT_DEEPSEEK_API_KEY", "").strip()
        self.base_url = _deepseek_base_url(
            os.getenv("AI_AGENT_DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        )
        self.model = os.getenv("AI_AGENT_DEEPSEEK_MODEL", "deepseek-chat").strip()
        self.timeout = _provider_timeout()

    def complete(
        self, messages: list[dict[str, Any]], tools: list[dict[str, Any]], iteration: int
    ) -> ModelTurn:
        if not self.api_key:
            raise AgentPipelineError(
                "PROVIDER_NOT_CONFIGURED",
                "AI_AGENT_DEEPSEEK_API_KEY is not configured.",
                503,
            )
        if not self.model:
            raise AgentPipelineError(
                "PROVIDER_NOT_CONFIGURED",
                "AI_AGENT_DEEPSEEK_MODEL is not configured.",
                503,
            )

        payload = _request_json(
            f"{self.base_url}/chat/completions",
            {
                "model": self.model,
                "messages": messages,
                "tools": [
                    {"type": "function", "function": tool} for tool in tools
                ],
                "tool_choice": "auto",
                "temperature": 0,
                "max_tokens": _max_output_tokens(),
            },
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            self.timeout,
        )
        return normalize_deepseek_response(payload, self.model)


def get_provider() -> DeepSeekProvider:
    if os.getenv("AI_AGENT_ENABLED", "true").strip().lower() in {
        "0",
        "false",
        "no",
        "off",
    }:
        raise AgentPipelineError(
            "AGENT_DISABLED", "The AI chat service is temporarily disabled.", 503
        )
    return DeepSeekProvider()


def _provider_timeout() -> float:
    raw_timeout = os.getenv("AI_AGENT_TIMEOUT_SECONDS", "45")
    try:
        timeout = float(raw_timeout)
    except ValueError as error:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION", "AI_AGENT_TIMEOUT_SECONDS must be numeric.", 503
        ) from error
    if not 1 <= timeout <= MAX_PROVIDER_TIMEOUT:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION",
            f"AI_AGENT_TIMEOUT_SECONDS must be between 1 and {MAX_PROVIDER_TIMEOUT}.",
            503,
        )
    return timeout


def _max_output_tokens() -> int:
    raw_tokens = os.getenv("AI_AGENT_MAX_OUTPUT_TOKENS", str(DEFAULT_MAX_OUTPUT_TOKENS))
    try:
        tokens = int(raw_tokens)
    except ValueError as error:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION", "AI_AGENT_MAX_OUTPUT_TOKENS must be an integer.", 503
        ) from error
    if not 128 <= tokens <= MAX_OUTPUT_TOKENS:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION",
            f"AI_AGENT_MAX_OUTPUT_TOKENS must be between 128 and {MAX_OUTPUT_TOKENS}.",
            503,
        )
    return tokens


def _deepseek_base_url(value: str) -> str:
    try:
        parsed = urlsplit(value.strip().rstrip("/"))
        port = parsed.port
    except ValueError as error:
        raise AgentPipelineError(
            "INVALID_CONFIGURATION",
            "AI_AGENT_DEEPSEEK_BASE_URL must use the official HTTPS DeepSeek API.",
            503,
        ) from error
    if (
        parsed.scheme != "https"
        or parsed.hostname != "api.deepseek.com"
        or port
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/", "/v1")
    ):
        raise AgentPipelineError(
            "INVALID_CONFIGURATION",
            "AI_AGENT_DEEPSEEK_BASE_URL must use the official HTTPS DeepSeek API.",
            503,
        )
    return f"https://api.deepseek.com{parsed.path.rstrip('/')}"


def _request_json(
    url: str, payload: dict[str, Any], headers: dict[str, str], timeout: float
) -> Any:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(url, data=body, headers=headers, method="POST")
    try:
        with _safe_urlopen(request, timeout=timeout) as response:
            body = response.read(MAX_PROVIDER_RESPONSE_BYTES + 1)
            if len(body) > MAX_PROVIDER_RESPONSE_BYTES:
                raise AgentPipelineError(
                    "PROVIDER_RESPONSE_TOO_LARGE",
                    "Provider response exceeded the size limit.",
                )
            return json.loads(body.decode("utf-8"))
    except HTTPError as error:
        raise AgentPipelineError(
            "MODEL_PROVIDER_ERROR", f"Provider returned HTTP {error.code}."
        ) from error
    except (TimeoutError, socket.timeout) as error:
        raise AgentPipelineError(
            "PROVIDER_TIMEOUT", "Provider request timed out.", 504
        ) from error
    except URLError as error:
        if isinstance(error.reason, (TimeoutError, socket.timeout)):
            raise AgentPipelineError(
                "PROVIDER_TIMEOUT", "Provider request timed out.", 504
            ) from error
        raise AgentPipelineError(
            "MODEL_PROVIDER_ERROR", "Provider could not be reached."
        ) from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AgentPipelineError(
            "INVALID_PROVIDER_RESPONSE", "Provider returned invalid JSON."
        ) from error
