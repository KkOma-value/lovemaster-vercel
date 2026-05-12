from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator

import httpx

from .settings import settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


class AIClient:
    async def complete(self, *, system: str, user: str, model: str | None = None) -> str:
        if settings.ai_provider == "fake":
            return await FakeAIClient().complete(system=system, user=user, model=model)
        if settings.nvidia_api_key:
            return await self._complete_openai_compatible(system=system, user=user, model=model)
        return await FakeAIClient().complete(system=system, user=user, model=model)

    async def complete_with_tools(
        self,
        *,
        system: str,
        user: str,
        tools: list[dict],
        tool_executor,
        model: str | None = None,
        max_rounds: int = 5,
        on_tool_call=None,
    ) -> str:
        """Complete with tool-calling loop. Returns final text response.

        Args:
            tools: OpenAI-format tool definitions
            tool_executor: callable(name, **kwargs) -> dict
            max_rounds: max tool-calling iterations
            on_tool_call: optional callback(name, args) for progress reporting
        """
        if not settings.nvidia_api_key:
            return await FakeAIClient().complete(system=system, user=user, model=model)
        if not tools:
            return await self.complete(system=system, user=user, model=model)

        base_url = settings.nvidia_base_url.rstrip("/")
        selected_model = model or settings.nvidia_model_tools
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

        for round_num in range(max_rounds):
            response = await get_client().post(
                f"{base_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.nvidia_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": selected_model,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.7,
                },
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()
            choice = payload["choices"][0]
            message = choice["message"]

            # No tool calls — return the text response
            if not message.get("tool_calls"):
                return message.get("content") or ""

            # Execute tool calls and append results
            messages.append(message)
            for tool_call in message["tool_calls"]:
                func = tool_call.get("function", {})
                tool_name = func.get("name", "")
                try:
                    tool_args = json.loads(func.get("arguments", "{}"))
                except json.JSONDecodeError:
                    tool_args = {}

                if on_tool_call:
                    on_tool_call(tool_name, tool_args)

                try:
                    result = await asyncio.to_thread(tool_executor, tool_name, **tool_args)
                    result_str = json.dumps(result, ensure_ascii=False)[:4000]
                except Exception as exc:
                    result_str = json.dumps({"error": str(exc)}, ensure_ascii=False)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": result_str,
                })

        # Max rounds exceeded — return whatever the last message says
        last = messages[-1]
        return last.get("content") or "工具调用轮次已达上限，请基于已有信息回复。"

    async def complete_vision(self, *, system: str, user: str, image_url: str, model: str | None = None) -> str | None:
        """Send a multimodal message with image to a vision model.

        Returns the model's text response, or None if vision is not available.
        Callers MUST handle None — do NOT fallback to sending the URL as plain text.
        """
        if not settings.nvidia_api_key:
            logger.warning("Vision skipped: NVIDIA_API_KEY not set")
            return None
        vision_model = model or settings.nvidia_model_vision
        if not vision_model:
            logger.warning("Vision skipped: no vision model configured")
            return None
        base_url = settings.nvidia_base_url.rstrip("/")
        try:
            response = await get_client().post(
                f"{base_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.nvidia_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": vision_model,
                    "messages": [
                        {"role": "system", "content": system},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user},
                                {"type": "image_url", "image_url": {"url": image_url}},
                            ],
                        },
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1024,
                },
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()
            content = payload["choices"][0]["message"]["content"]
            logger.info("Vision success: model=%s, chars=%d", vision_model, len(content or ""))
            return content
        except httpx.HTTPStatusError as exc:
            logger.error("Vision HTTP error: %d %s — %s", exc.response.status_code, exc.response.reason_phrase, exc.response.text[:200])
            return None
        except Exception as exc:
            logger.error("Vision failed: %s", exc)
            return None

    async def stream(self, *, system: str, user: str, model: str | None = None) -> AsyncGenerator[str, None]:
        if settings.ai_provider == "fake":
            async for chunk in FakeAIClient().stream(system=system, user=user, model=model):
                yield chunk
            return
        if settings.nvidia_api_key:
            async for chunk in self._stream_openai_compatible(system=system, user=user, model=model):
                yield chunk
            return
        async for chunk in FakeAIClient().stream(system=system, user=user, model=model):
            yield chunk

    async def _complete_openai_compatible(self, *, system: str, user: str, model: str | None) -> str:
        base_url = settings.nvidia_base_url.rstrip("/")
        selected_model = model or settings.nvidia_model_brain
        response = await get_client().post(
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

    async def _stream_openai_compatible(self, *, system: str, user: str, model: str | None) -> AsyncGenerator[str, None]:
        base_url = settings.nvidia_base_url.rstrip("/")
        selected_model = model or settings.nvidia_model_brain
        async with get_client().stream(
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
            async for line in response.aiter_lines():
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
    async def complete(self, *, system: str, user: str, model: str | None = None) -> str:
        if "[TOOLS:YES]" in user:
            return "我会先把需要外部资料的部分拆出来，再给你一份可执行的沟通计划。"
        return "已结合上下文生成建议：" + summarize(user)

    async def complete_with_tools(self, *, system: str, user: str, tools=None, tool_executor=None, **kwargs) -> str:
        return await self.complete(system=system, user=user)

    async def stream(self, *, system: str, user: str, model: str | None = None) -> AsyncGenerator[str, None]:
        text = await self.complete(system=system, user=user, model=model)
        for chunk in split_chunks(text, 6):
            yield chunk
            await asyncio.sleep(0.03)


def split_chunks(text: str, size: int) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)]


def summarize(text: str) -> str:
    compact = " ".join(text.split())
    return compact[:700]
