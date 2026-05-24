import asyncio
import json
import time
from collections.abc import AsyncIterator, Callable

KEEPALIVE_INTERVAL = 5.0


def event_payload(event_type: str, content: str = "", data: dict | None = None) -> str:
    payload = {
        "type": event_type,
        "content": content,
        "data": data or None,
    }
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _keepalive_line() -> str:
    return ": keepalive\n\n"


async def _timed_chunk_reader(
    chunks: AsyncIterator[str],
    timeout: float,
) -> AsyncIterator[str | None]:
    """Wrap an async iterator to yield keepalive sentinels when the upstream is silent.

    Yields each chunk from the upstream, or None when the upstream has been
    silent for ``timeout`` seconds. The caller can emit keepalive on None.
    """
    async def _next(itr: AsyncIterator[str]) -> tuple[bool, str]:
        try:
            return True, await itr.__anext__()
        except StopAsyncIteration:
            return False, ""

    itr = chunks.__aiter__()
    while True:
        done, chunk = await asyncio.wait_for(_next(itr), timeout=timeout)
        if not done:
            return
        yield chunk


async def stream_agent_chat(
    *,
    chat_type: str,
    chat_id: str,
    run_id: str,
    chunks: AsyncIterator[str],
    probability: dict | None = None,
    ocr: dict | None = None,
    progress_events: list[dict] | None = None,
    on_complete: Callable[[str], None] | None = None,
) -> AsyncIterator[str]:
    yield event_payload(
        "run_started",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "QUEUED"},
    )

    # Emit OCR result if available
    if ocr:
        if ocr.get("visionFailed"):
            yield event_payload(
                "vision_failed",
                "图片识别暂不可用，将以文字描述为准",
                {"message": "图片识别暂不可用，无法读取截图内容"},
            )
        elif ocr.get("ocrText") or ocr.get("sceneSummary"):
            yield event_payload(
                "ocr_result",
                "",
                {
                    "ocrText": ocr.get("ocrText", ""),
                    "sceneSummary": ocr.get("sceneSummary", ""),
                },
            )

    yield event_payload("rag_status", "正在查阅恋爱知识库，补充参考资料...")
    for event in progress_events or []:
        yield event_payload(event.get("type", "status"), event.get("content", ""), event.get("data"))
    if probability:
        yield event_payload("probability_result", "", {"runId": run_id, "chatId": chat_id, "probability": probability})
    yield event_payload("status", "正在生成对方意图分析和可直接发送的回复建议...")

    answer_parts: list[str] = []

    async for chunk in _timed_chunk_reader(chunks, KEEPALIVE_INTERVAL):
        if chunk is not None:
            answer_parts.append(chunk)
            yield event_payload("content", chunk)
        else:
            yield _keepalive_line()

    if not answer_parts:
        yield event_payload(
            "error",
            "AI 服务未返回内容，请稍后重试",
            {"runId": run_id, "chatId": chat_id},
        )

    full_answer = "".join(answer_parts)
    if on_complete:
        on_complete(full_answer)
    yield event_payload(
        "done",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "COMPLETED"},
    )
