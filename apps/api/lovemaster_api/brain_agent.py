"""BrainAgent: Multi-step reasoning for Coach mode.

Implements the three-phase pattern from the Java BrainAgentService:
1. Decide — analyze request, determine if tools are needed
2. Tools — conditionally execute tool-calling loop
3. Synthesize — generate final answer from tool results
"""
from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from dataclasses import dataclass

from .ai_client import AIClient
from .tools import ToolRegistry

logger = logging.getLogger(__name__)

DECIDE_SYSTEM_PROMPT = """
你是 Lovemaster 的 BrainAgent。你的任务是分析用户请求，决定是否需要外部工具。

分析步骤：
1. 理解用户的核心需求
2. 判断是否需要搜索外部信息、抓取网页、生成文件等
3. 给出决策

输出格式（严格遵守）：
如果需要工具：输出 [TOOLS:YES] 然后换行输出 [TASK_PROMPT: 具体任务描述]
如果不需要工具：输出 [TOOLS:NO] 然后换行输出 [DIRECT_ANSWER: 直接回答的要点]

不要输出其他内容。
"""

SYNTHESIZE_SYSTEM_PROMPT = """
你是 Lovemaster 的 Coach 模式。你收到了工具执行的结果，请综合所有信息给用户一个结构化的建议。

要求：
1. 先总结工具搜索到的关键信息
2. 给出针对性的建议
3. 如果有行动计划，列出具体步骤
4. 保持温暖、专业的语调
"""


@dataclass
class BrainDecision:
    needs_tools: bool
    task_prompt: str = ""
    direct_answer: str = ""


class BrainAgent:
    def __init__(self, ai_client: AIClient, tool_registry: ToolRegistry) -> None:
        self.ai_client = ai_client
        self.tool_registry = tool_registry

    async def decide(self, message: str, context: str, rag: str) -> BrainDecision:
        """Phase 1: Determine if tools are needed."""
        user_prompt = f"""
用户请求：{message}

上下文：
{context or '无'}

知识参考：
{rag or '无'}
"""
        try:
            response = await self.ai_client.complete(
                system=DECIDE_SYSTEM_PROMPT,
                user=user_prompt,
            )
            return self._parse_decision(response)
        except Exception:
            logger.warning("BrainAgent decide failed, defaulting to no tools", exc_info=True)
            return BrainDecision(needs_tools=False, direct_answer="")

    async def synthesize(self, message: str, context: str, rag: str, tool_results: str) -> str:
        """Phase 3: Generate final answer from tool results."""
        user_prompt = f"""
用户请求：{message}

上下文：
{context or '无'}

知识参考：
{rag or '无'}

工具执行结果：
{tool_results or '无工具执行结果'}

请基于以上信息，给出结构化的建议。
"""
        return await self.ai_client.complete(
            system=SYNTHESIZE_SYSTEM_PROMPT,
            user=user_prompt,
        )

    async def stream_decide_and_respond(
        self,
        message: str,
        context: str,
        rag: str,
        history: list[dict],
    ) -> AsyncGenerator[str, None]:
        """Full pipeline: decide -> (tools) -> synthesize, yielding SSE status events.

        Yields JSON-encoded status events for the SSE stream.
        """
        import json as json_mod

        # Phase 1: Decide
        yield json_mod.dumps({"type": "phase", "phase": "decide", "content": "正在分析你的请求..."}, ensure_ascii=False)
        decision = await self.decide(message, context, rag)

        if not decision.needs_tools:
            # Fast path: direct answer
            yield json_mod.dumps({"type": "phase", "phase": "direct", "content": "正在生成回复..."}, ensure_ascii=False)
            answer = await self.ai_client.complete(
                system=SYNTHESIZE_SYSTEM_PROMPT,
                user=f"用户请求：{message}\n\n上下文：{context or '无'}\n\n知识参考：{rag or '无'}",
            )
            yield json_mod.dumps({"type": "content", "content": answer}, ensure_ascii=False)
            return

        # Phase 2: Tools
        yield json_mod.dumps({"type": "phase", "phase": "tools", "content": "正在搜索相关信息..."}, ensure_ascii=False)

        tool_results = ""
        try:
            tool_results = await self.ai_client.complete_with_tools(
                system=f"执行以下任务：{decision.task_prompt}",
                user=message,
                tools=self.tool_registry.definitions(),
                tool_executor=self.tool_registry.run,
                on_tool_call=lambda name, args: logger.info("BrainAgent tool: %s(%s)", name, args),
            )
        except Exception:
            logger.warning("BrainAgent tool execution failed", exc_info=True)
            tool_results = "工具执行失败，将基于已有信息回答。"

        # Phase 3: Synthesize
        yield json_mod.dumps({"type": "phase", "phase": "synthesize", "content": "正在综合分析..."}, ensure_ascii=False)
        final_answer = await self.synthesize(message, context, rag, tool_results)
        yield json_mod.dumps({"type": "content", "content": final_answer}, ensure_ascii=False)

    def _parse_decision(self, response: str) -> BrainDecision:
        """Parse the brain model's decision response."""
        text = response.strip()

        if "[TOOLS:YES]" in text:
            # Extract task prompt
            task_prompt = ""
            if "[TASK_PROMPT:" in text:
                start = text.index("[TASK_PROMPT:") + len("[TASK_PROMPT:")
                end = text.index("]", start) if "]" in text[start:] else len(text)
                task_prompt = text[start:end].strip()
            return BrainDecision(needs_tools=True, task_prompt=task_prompt or text)

        if "[TOOLS:NO]" in text:
            direct_answer = ""
            if "[DIRECT_ANSWER:" in text:
                start = text.index("[DIRECT_ANSWER:") + len("[DIRECT_ANSWER:")
                end = text.index("]", start) if "]" in text[start:] else len(text)
                direct_answer = text[start:end].strip()
            return BrainDecision(needs_tools=False, direct_answer=direct_answer)

        # Fallback: if we can't parse, assume no tools needed
        logger.warning("Could not parse BrainAgent decision: %s", text[:200])
        return BrainDecision(needs_tools=False, direct_answer=text)


# Singleton instance (will be initialized after tool_registry is available)
brain_agent: BrainAgent | None = None


def get_brain_agent() -> BrainAgent:
    global brain_agent
    if brain_agent is None:
        from .ai_client import AIClient
        from .tools import tool_registry
        brain_agent = BrainAgent(AIClient(), tool_registry)
    return brain_agent
