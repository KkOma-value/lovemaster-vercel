from __future__ import annotations

from collections.abc import Iterable

from .ai_client import AIClient
from .knowledge import RagKnowledgeService
from .multimodal import ocr_service, probability_service


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
    def __init__(self, ai_client: AIClient | None = None, rag_service: RagKnowledgeService | None = None) -> None:
        self.ai_client = ai_client or AIClient()
        self.rag_service = rag_service or RagKnowledgeService()

    def love_answer(self, message: str, *, image_url: str | None = None) -> str:
        ocr = ocr_service.extract(image_url, message)
        rag = self.rag_service.retrieve(build_rag_query(message, ocr))
        user_prompt = build_love_prompt(message, rag, image_url, ocr)
        return self.ai_client.complete(system=LOVE_SYSTEM_PROMPT, user=user_prompt)

    def love_stream(self, message: str, *, image_url: str | None = None) -> Iterable[str]:
        ocr = ocr_service.extract(image_url, message)
        rag = self.rag_service.retrieve(build_rag_query(message, ocr))
        user_prompt = build_love_prompt(message, rag, image_url, ocr)
        return self.ai_client.stream(system=LOVE_SYSTEM_PROMPT, user=user_prompt)

    def coach_answer(self, message: str, *, image_url: str | None = None) -> str:
        ocr = ocr_service.extract(image_url, message)
        rag = self.rag_service.retrieve(build_rag_query(message, ocr))
        tool_marker = "[TOOLS:YES]\n" if likely_needs_tools(message) else "[TOOLS:NO]\n"
        user_prompt = tool_marker + build_coach_prompt(message, rag, image_url, ocr)
        return self.ai_client.complete(system=COACH_SYSTEM_PROMPT, user=user_prompt)

    def coach_stream(self, message: str, *, image_url: str | None = None) -> Iterable[str]:
        ocr = ocr_service.extract(image_url, message)
        rag = self.rag_service.retrieve(build_rag_query(message, ocr))
        tool_marker = "[TOOLS:YES]\n" if likely_needs_tools(message) else "[TOOLS:NO]\n"
        user_prompt = tool_marker + build_coach_prompt(message, rag, image_url, ocr)
        return self.ai_client.stream(system=COACH_SYSTEM_PROMPT, user=user_prompt)

    def probability(self, message: str, *, image_url: str | None = None) -> dict | None:
        if not probability_requested(message):
            return None
        ocr = ocr_service.extract(image_url, message)
        rag = self.rag_service.retrieve(build_rag_query(message, ocr))
        return probability_service.analyze(message, rag_context=rag, ocr_text=ocr.get("ocrText", ""))


def likely_needs_tools(message: str) -> bool:
    keywords = ["搜索", "搜", "查", "资料", "计划", "整理一份", "生成", "pdf", "文件", "邮件"]
    lowered = message.lower()
    return any(keyword in lowered for keyword in keywords)


def build_love_prompt(message: str, rag: str, image_url: str | None, ocr: dict | None = None) -> str:
    return f"""
# 用户问题
{message}

# 图片上下文
{image_url or "无"}

# OCR/截图摘要
{(ocr or {}).get("sceneSummary") or "无"}
{(ocr or {}).get("ocrText") or ""}

# 相关知识参考
{rag or "无"}

请输出自然、亲切、可执行的恋爱沟通建议。
"""


def build_coach_prompt(message: str, rag: str, image_url: str | None, ocr: dict | None = None) -> str:
    return f"""
# 用户任务
{message}

# 图片上下文
{image_url or "无"}

# OCR/截图摘要
{(ocr or {}).get("sceneSummary") or "无"}
{(ocr or {}).get("ocrText") or ""}

# 相关知识参考
{rag or "无"}

请判断需求，给出下一步行动建议。
"""


def build_rag_query(message: str, ocr: dict | None = None) -> str:
    summary = (ocr or {}).get("sceneSummary") or ""
    ocr_text = (ocr or {}).get("ocrText") or ""
    return " / ".join(part for part in [summary, ocr_text, message] if part)


def probability_requested(message: str) -> bool:
    keywords = ["成功率", "概率", "有没有戏", "有戏", "机会大", "可能性"]
    return any(keyword in message for keyword in keywords)


agent_orchestrator = AgentOrchestrator()
