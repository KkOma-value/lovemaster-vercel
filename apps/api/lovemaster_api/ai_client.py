from __future__ import annotations

import json
import time
from collections.abc import Generator

import httpx

from .settings import settings


class AIClient:
    def complete(self, *, system: str, user: str, model: str | None = None) -> str:
        if settings.ai_provider == "fake":
            return FakeAIClient().complete(system=system, user=user, model=model)
        if settings.nvidia_api_key:
            return self._complete_openai_compatible(system=system, user=user, model=model)
        return FakeAIClient().complete(system=system, user=user, model=model)

    def stream(self, *, system: str, user: str, model: str | None = None) -> Generator[str, None, None]:
        if settings.ai_provider == "fake":
            yield from FakeAIClient().stream(system=system, user=user, model=model)
            return
        if settings.nvidia_api_key:
            yield from self._stream_openai_compatible(system=system, user=user, model=model)
            return
        yield from FakeAIClient().stream(system=system, user=user, model=model)

    def _complete_openai_compatible(self, *, system: str, user: str, model: str | None) -> str:
        base_url = settings.nvidia_base_url.rstrip("/")
        selected_model = model or settings.nvidia_model_brain
        response = httpx.post(
            f"{base_url}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": selected_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.7,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["choices"][0]["message"]["content"]

    def _stream_openai_compatible(self, *, system: str, user: str, model: str | None) -> Generator[str, None, None]:
        base_url = settings.nvidia_base_url.rstrip("/")
        selected_model = model or settings.nvidia_model_brain
        with httpx.stream(
            "POST",
            f"{base_url}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": selected_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.7,
                "stream": True,
            },
            timeout=120,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    return
                try:
                    data = json.loads(data_str)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content")
                    if content:
                        yield content
                except (json.JSONDecodeError, IndexError, KeyError):
                    continue


class FakeAIClient:
    def complete(self, *, system: str, user: str, model: str | None = None) -> str:
        if "[TOOLS:YES]" in user:
            return "我会先把需要外部资料的部分拆出来，再给你一份可执行的沟通计划。"
        return "已结合上下文生成建议：" + summarize(user)

    def stream(self, *, system: str, user: str, model: str | None = None) -> Generator[str, None, None]:
        text = self.complete(system=system, user=user, model=model)
        for chunk in split_chunks(text, 6):
            yield chunk
            time.sleep(0.03)


def split_chunks(text: str, size: int) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)]


def summarize(text: str) -> str:
    compact = " ".join(text.split())
    return compact[:700]
