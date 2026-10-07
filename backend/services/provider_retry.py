"""One retry owner. Authentication/validation errors are never retried."""
import asyncio
from urllib.parse import urlparse
import httpx
from openai import APIConnectionError, APITimeoutError, APIStatusError


async def chat_completion(client, **kwargs):
    from backend.config import settings
    # Hybrid DeepSeek models default to thinking. Small stage budgets must
    # remain available for the JSON/text that the pipeline actually consumes.
    if (urlparse(settings.base_url).hostname == "api.deepseek.com"
            and kwargs.get("model") in {"deepseek-flash", "deepseek-v4-flash", "deepseek-v4-pro"}
            and "reasoning_effort" not in kwargs):
        extra_body = dict(kwargs.get("extra_body") or {})
        extra_body.setdefault("thinking", {"type": "disabled"})
        kwargs["extra_body"] = extra_body
    async with asyncio.timeout(settings.model_request_timeout):
        return await request_with_retry(lambda: client.chat.completions.create(**kwargs))


async def request_with_retry(operation):
    for attempt in range(2):
        try:
            return await operation()
        except (APIConnectionError, APITimeoutError, APIStatusError, httpx.TransportError, httpx.HTTPStatusError) as exc:
            response = getattr(exc, "response", None)
            status = getattr(exc, "status_code", None) or getattr(response, "status_code", None)
            if attempt or (status is not None and status != 429 and status < 500):
                raise
            delay = 1.0
            if response is not None:
                try:
                    delay = min(5.0, max(0.0, float(response.headers.get("retry-after", "1"))))
                except ValueError:
                    pass
            await asyncio.sleep(delay)
