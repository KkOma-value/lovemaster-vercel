from __future__ import annotations

import json
from collections.abc import Iterable

import httpx

from .settings import settings


class AIClient:
    def complete(self, *, system: str, user: str, model: str | None = None) -> str:
        if settings.ai_provider == "fake":
            return FakeAIClient().complete(system=system, user=user, model=model)
        if settings.nvidia_api_key:
            return self._complete_openai_compatible(system=system, user=user, model=model)
        return FakeAIClient().complete(system=system, user=user, model=model)

    def stream(self, *, system: str, user: str, model: str | None = None) -> Iterable[str]:
        text = self.complete(system=system, user=user, model=model)
        return split_chunks(text, 48)

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


class FakeAIClient:
    def complete(self, *, system: str, user: str, model: str | None = None) -> str:
        if "[TOOLS:YES]" in user:
            return "我会先把需要外部资料的部分拆出来，再给你一份可执行的沟通计划。"
        return "已结合上下文生成建议：" + summarize(user)

    def stream(self, *, system: str, user: str, model: str | None = None) -> Iterable[str]:
        return split_chunks(self.complete(system=system, user=user, model=model), 48)


def split_chunks(text: str, size: int) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)]


def summarize(text: str) -> str:
    compact = " ".join(text.split())
    return compact[:700]
