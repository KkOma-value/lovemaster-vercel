from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator

from .advisors import check_taboo, rereading_advisor
from .ai_client import AIClient
from .brain_agent import get_brain_agent
from .knowledge import RagKnowledgeService
from .multimodal import ocr_service, probability_service
from .settings import settings
from .tools import tool_registry

logger = logging.getLogger(__name__)

LOVE_SYSTEM_PROMPT = """
你是 Lovemaster 的 Love 模式。你提供温柔、自然、低压力的恋爱沟通陪伴。
回答要先接住用户情绪，再分析信号，最后给 2-3 条可直接发送的话术。
不要编造事实，不要把知识库内容当成绝对结论。
"""

COACH_SYSTEM_PROMPT = """
你是 Lovemaster 的 Coach 模式。你先判断需求是否需要外部资料或工具。
如果不需要工具，直接给结构化建议；如果需要工具，先说明任务拆解和当前可执行建议。
"""


class AgentOrchestrator:
    def __init__(
        self,
        ai_client: AIClient | None = None,
        rag_service: RagKnowledgeService | None = None,
        repository=None,
    ) -> None:
        self.ai_client = ai_client or AIClient()
        self.rag_service = rag_service or RagKnowledgeService()
        self._repository = repository

    def set_repository(self, repository) -> None:
        self._repository = repository

    async def love_answer(self, message: str, *, image_url: str | None = None, chat_id: str | None = None) -> str:
        history = await self._load_history(chat_id)
        ocr = await ocr_service.extract(image_url, message)
        rag = await self.rag_service.retrieve(build_rag_query(message, ocr))
        user_prompt = build_love_prompt(message, rag, image_url, ocr, history=history)
        return await self.ai_client.complete(system=LOVE_SYSTEM_PROMPT, user=user_prompt)

    async def love_stream(
        self,
        message: str,
        *,
        image_url: str | None = None,
        chat_id: str | None = None,
    ) -> tuple[AsyncIterator[str], dict | None, dict]:
        """Stream Love mode response. Returns (chunks, probability, ocr_result).

        OCR and RAG are computed once and shared. Probability is computed inline
        only when the user requests it.
        """
        # Advisor: taboo word check
        if settings.advisor_taboo_enabled:
            taboo_reply = check_taboo(message)
            if taboo_reply:
                return _single_chunk_iter(taboo_reply), None, {}

        history = await self._load_history(chat_id)
        ocr = await ocr_service.extract(image_url, message)
        rag = await self.rag_service.retrieve(build_rag_query(message, ocr))

        probability = None
        if probability_requested(message):
            probability = await probability_service.analyze(
                message, rag_context=rag, ocr_text=ocr.get("ocrText", "")
            )

        user_prompt = build_love_prompt(message, rag, image_url, ocr, probability, history)

        # Advisor: ReReading (Re2) transform
        if settings.advisor_rereading_enabled:
            user_prompt = rereading_advisor.transform(user_prompt)

        chunks = await self.ai_client.stream(system=LOVE_SYSTEM_PROMPT, user=user_prompt)
        return chunks, probability, ocr

    async def coach_answer(self, message: str, *, image_url: str | None = None, chat_id: str | None = None) -> str:
        history = await self._load_history(chat_id)
        ocr = await ocr_service.extract(image_url, message)
        rag = await self.rag_service.retrieve(build_rag_query(message, ocr))
        user_prompt = build_coach_prompt(message, rag, image_url, ocr, history)
        if likely_needs_tools(message):
            return await self.ai_client.complete_with_tools(
                system=COACH_SYSTEM_PROMPT,
                user=user_prompt,
                tools=tool_registry.definitions(),
                tool_executor=tool_registry.run,
            )
        return await self.ai_client.complete(system=COACH_SYSTEM_PROMPT, user=user_prompt)

    async def coach_stream(
        self,
        message: str,
        *,
        image_url: str | None = None,
        chat_id: str | None = None,
    ) -> tuple[AsyncIterator[str], dict]:
        """Stream Coach mode response. Returns (chunks, ocr_result).

        When tools are likely needed, runs the tool-calling loop first
        and yields the final result as a single chunk.
        """
        # Advisor: taboo word check
        if settings.advisor_taboo_enabled:
            taboo_reply = check_taboo(message)
            if taboo_reply:
                return _single_chunk_iter(taboo_reply), {}

        history = await self._load_history(chat_id)
        ocr = await ocr_service.extract(image_url, message)
        rag = await self.rag_service.retrieve(build_rag_query(message, ocr))
        user_prompt = build_coach_prompt(message, rag, image_url, ocr, history)

        # Advisor: ReReading (Re2) transform
        if settings.advisor_rereading_enabled:
            user_prompt = rereading_advisor.transform(user_prompt)

        # Use BrainAgent for AI-based tool decision (falls back to keyword matching)
        brain = get_brain_agent()
        decision = await brain.decide(message, user_prompt, rag)

        if decision.needs_tools:
            logger.info("BrainAgent decided tools needed: %s", decision.task_prompt[:100])
            result = await self.ai_client.complete_with_tools(
                system=COACH_SYSTEM_PROMPT,
                user=user_prompt,
                tools=tool_registry.definitions(),
                tool_executor=tool_registry.run,
                on_tool_call=lambda name, args: logger.info("Tool call: %s(%s)", name, args),
            )
            # Synthesize tool results into final answer
            final = await brain.synthesize(message, user_prompt, rag, result)
            return _single_chunk_iter(final), ocr

        chunks = await self.ai_client.stream(system=COACH_SYSTEM_PROMPT, user=user_prompt)
        return chunks, ocr

    async def _load_history(self, chat_id: str | None, limit: int = 10) -> list[dict]:
        if not chat_id or not self._repository:
            return []
        try:
            return await asyncio.to_thread(self._repository.get_messages, chat_id, limit=limit)
        except Exception:
            logger.warning("Failed to load chat history for %s", chat_id)
            return []


def likely_needs_tools(message: str) -> bool:
    keywords = ["搜索", "搜", "查", "资料", "计划", "整理一份", "生成", "pdf", "文件", "邮件"]
    lowered = message.lower()
    return any(keyword in lowered for keyword in keywords)


async def _single_chunk_iter(text: str) -> AsyncIterator[str]:
    yield text


def format_history(history: list[dict]) -> str:
    if not history:
        return ""
    lines = []
    for msg in history:
        role = "用户" if msg.get("role") == "user" else "助手"
        content = msg.get("content", "")
        if len(content) > 300:
            content = content[:300] + "..."
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def build_love_prompt(
    message: str,
    rag: str,
    image_url: str | None,
    ocr: dict | None = None,
    probability: dict | None = None,
    history: list[dict] | None = None,
) -> str:
    history_section = ""
    if history:
        history_text = format_history(history)
        history_section = f"""
# 对话历史
{history_text}
"""

    probability_section = ""
    if probability:
        probability_section = f"""
# 成功率分析
- 成功率：{probability.get('probability', 50)}%
- 等级：{probability.get('tier', '一般')}
- 置信度：{probability.get('confidence', 'medium')}
- 概要：{probability.get('summary', '')}
- 正面信号：{', '.join(flag.get('text', '') for flag in probability.get('greenFlags', []))}
- 风险信号：{', '.join(flag.get('text', '') for flag in probability.get('redFlags', []))}
"""

    vision_note = ""
    if ocr and ocr.get("visionFailed"):
        vision_note = "\n（注意：用户发送了图片但系统无法识别图片内容，请基于文字描述回复）\n"

    return f"""
{history_section}
# 用户问题
{message}

# 图片上下文
{image_url or "无"}

# OCR/截图摘要
{(ocr or {}).get("sceneSummary") or "无"}
{(ocr or {}).get("ocrText") or ""}
{vision_note}
# 相关知识参考
{rag or "无"}
{probability_section}
请输出自然、亲切、可执行的恋爱沟通建议。如果对话历史中有之前的交流，请保持连贯性。
如果提供了成功率分析，请在回复中引用并解释这个概率。
"""


def build_coach_prompt(
    message: str,
    rag: str,
    image_url: str | None,
    ocr: dict | None = None,
    history: list[dict] | None = None,
) -> str:
    history_section = ""
    if history:
        history_text = format_history(history)
        history_section = f"""
# 对话历史
{history_text}
"""

    vision_note = ""
    if ocr and ocr.get("visionFailed"):
        vision_note = "\n（注意：用户发送了图片但系统无法识别图片内容，请基于文字描述回复）\n"

    return f"""
{history_section}
# 用户任务
{message}

# 图片上下文
{image_url or "无"}

# OCR/截图摘要
{(ocr or {}).get("sceneSummary") or "无"}
{(ocr or {}).get("ocrText") or ""}
{vision_note}
# 相关知识参考
{rag or "无"}

请判断需求，给出下一步行动建议。如果对话历史中有之前的交流，请保持连贯性。
"""


def build_rag_query(message: str, ocr: dict | None = None) -> str:
    summary = (ocr or {}).get("sceneSummary") or ""
    ocr_text = (ocr or {}).get("ocrText") or ""
    return " / ".join(part for part in [summary, ocr_text, message] if part)


def probability_requested(message: str) -> bool:
    keywords = ["成功率", "概率", "有没有戏", "有戏", "机会大", "可能性"]
    return any(keyword in message for keyword in keywords)


agent_orchestrator = AgentOrchestrator()
