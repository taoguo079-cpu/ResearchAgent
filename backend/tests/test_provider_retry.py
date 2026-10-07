import asyncio
from unittest.mock import AsyncMock

import httpx
from openai import APIStatusError
import pytest

from backend.services.provider_retry import request_with_retry


@pytest.mark.asyncio
@pytest.mark.parametrize("base_url,model,expected", [
    ("https://api.deepseek.com", "deepseek-flash", True),
    ("https://api.deepseek.com/v1", "deepseek-v4-pro", True),
    ("https://api.deepseek.com", "deepseek-reasoner", False),
    ("https://other-provider.test", "deepseek-flash", False),
    ("https://api.deepseek.com", "other-model", False),
])
async def test_bounded_deepseek_completions_reserve_budget_for_visible_output(monkeypatch, base_url, model, expected):
    from types import SimpleNamespace
    from backend.config import settings
    from backend.services.provider_retry import chat_completion
    monkeypatch.setattr(settings, "base_url", base_url)
    create = AsyncMock(return_value="response")
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    assert await chat_completion(client, model=model, max_tokens=500) == "response"
    kwargs = create.call_args.kwargs
    assert kwargs.get("extra_body") == ({"thinking": {"type": "disabled"}} if expected else None)


@pytest.mark.asyncio
async def test_explicit_thinking_options_are_preserved(monkeypatch):
    from types import SimpleNamespace
    from backend.config import settings
    from backend.services.provider_retry import chat_completion
    monkeypatch.setattr(settings, "base_url", "https://api.deepseek.com")
    create = AsyncMock()
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    await chat_completion(client, model="deepseek-flash", extra_body={"thinking": {"type": "enabled"}})
    assert create.call_args.kwargs["extra_body"]["thinking"]["type"] == "enabled"
    await chat_completion(client, model="deepseek-flash", reasoning_effort="low")
    assert "extra_body" not in create.call_args.kwargs


@pytest.mark.asyncio
@pytest.mark.parametrize("status,attempts", [(401, 1), (403, 1), (429, 2), (503, 2)])
async def test_retry_only_transient_errors(status, attempts):
    response = httpx.Response(status, headers={"retry-after": "0"}, request=httpx.Request("POST", "https://invalid.test"))
    operation = AsyncMock(side_effect=APIStatusError("injected", response=response, body=None))
    with pytest.raises(APIStatusError):
        await request_with_retry(operation)
    assert operation.await_count == attempts


@pytest.mark.asyncio
async def test_retry_wait_obeys_outer_deadline():
    response = httpx.Response(429, headers={"retry-after": "5"}, request=httpx.Request("POST", "https://invalid.test"))
    operation = AsyncMock(side_effect=APIStatusError("injected", response=response, body=None))
    with pytest.raises(TimeoutError):
        async with asyncio.timeout(0.03):
            await request_with_retry(operation)
    assert operation.await_count == 1
