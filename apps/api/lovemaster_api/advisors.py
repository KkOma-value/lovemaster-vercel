"""Advisor chain for AI request/response processing.

Provides lightweight middleware-style advisors that wrap AI calls:
- TabooWordAdvisor: blocks harmful content
- LoggingAdvisor: request/response observability
- ReReadingAdvisor: Re2 reasoning enhancement (disabled by default)
"""
from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator, Callable, Awaitable
from typing import Any

logger = logging.getLogger(__name__)

# --- Taboo Word Advisor ---

TABOO_WORDS = [
    "下药", "侵犯", "殴打", "迷药", "强暴", "胁迫",
    "威胁", "勒索", "偷拍", "跟踪", "骚扰",
]
TABOO_REPLY = "抱歉，我无法回答涉及有害行为的问题。如果你遇到了困难或危险，请寻求专业帮助或联系相关部门。"


def check_taboo(message: str) -> str | None:
    """Return TABOO_REPLY if message contains taboo words, else None."""
    lowered = message.lower()
    for word in TABOO_WORDS:
        if word in lowered:
            logger.warning("Taboo word detected: %s", word)
            return TABOO_REPLY
    return None


# --- Logging Advisor ---

class LoggingAdvisor:
    """Logs AI request/response for observability."""

    async def wrap_complete(
        self,
        system: str,
        user: str,
        call: Callable[..., Awaitable[str]],
        **kwargs: Any,
    ) -> str:
        logger.info("AI Request: system=%s..., user=%s...", system[:80], user[:200])
        start = time.monotonic()
        result = await call(system=system, user=user, **kwargs)
        elapsed = time.monotonic() - start
        logger.info("AI Response: chars=%d, elapsed=%.2fs", len(result), elapsed)
        return result

    async def wrap_stream(
        self,
        system: str,
        user: str,
        call: Callable[..., Awaitable[AsyncGenerator[str, None]]],
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        logger.info("AI Stream Request: system=%s..., user=%s...", system[:80], user[:200])
        start = time.monotonic()
        chunk_count = 0
        total_chars = 0
        gen = await call(system=system, user=user, **kwargs)
        async for chunk in gen:
            chunk_count += 1
            total_chars += len(chunk)
            yield chunk
        elapsed = time.monotonic() - start
        logger.info("AI Stream Complete: chunks=%d, chars=%d, elapsed=%.2fs", chunk_count, total_chars, elapsed)


# --- ReReading Advisor (Re2) ---

class ReReadingAdvisor:
    """Doubles the user query to improve reasoning (Re2 paper).

    Note: doubles token usage. Disabled by default.
    """

    def transform(self, user: str) -> str:
        return f"{user}\nRead the question again: {user}"


# Singleton instances
logging_advisor = LoggingAdvisor()
rereading_advisor = ReReadingAdvisor()
