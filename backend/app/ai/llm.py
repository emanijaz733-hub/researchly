"""Provider-agnostic LLM layer with streaming.

Backends: Anthropic, OpenAI, Grok (xAI), or `none`. Grok speaks the
OpenAI-compatible protocol, so it reuses OpenAIBackend with a different
base URL. With no key configured, callers
fall back to an extractive answer (see app.ai.answer), so search works
out of the box.
"""
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

import httpx

from app.core.config import get_settings


class LLMBackend(ABC):
    @abstractmethod
    def stream(self, system: str, user: str) -> AsyncIterator[str]:
        """Yield text deltas."""
        raise NotImplementedError


class AnthropicBackend(LLMBackend):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    async def stream(self, system: str, user: str) -> AsyncIterator[str]:
        import json

        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 1500,
                    "system": system,
                    "stream": True,
                    "messages": [{"role": "user", "content": user}],
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        event = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue
                    if event.get("type") == "content_block_delta":
                        text = event.get("delta", {}).get("text", "")
                        if text:
                            yield text


class OpenAIBackend(LLMBackend):
    """OpenAI-compatible chat completions (OpenAI, Grok/xAI, and others)."""

    def __init__(self, api_key: str, model: str, base_url: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    async def stream(self, system: str, user: str) -> AsyncIterator[str]:
        import json

        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "stream": True,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: ") or line.strip() == "data: [DONE]":
                        continue
                    try:
                        event = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue
                    delta = event.get("choices", [{}])[0].get("delta", {}).get("content")
                    if delta:
                        yield delta


def get_backend() -> LLMBackend | None:
    settings = get_settings()
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        return AnthropicBackend(settings.anthropic_api_key, settings.llm_model)
    if settings.llm_provider == "openai" and settings.openai_api_key:
        return OpenAIBackend(settings.openai_api_key, settings.llm_model)
    if settings.llm_provider == "grok" and settings.grok_api_key:
        return OpenAIBackend(
            settings.grok_api_key, settings.llm_model, base_url="https://api.x.ai/v1"
        )
    return None
