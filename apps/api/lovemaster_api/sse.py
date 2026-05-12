import json
from collections.abc import AsyncIterator, Callable


def event_payload(event_type: str, content: str = "", data: dict | None = None) -> str:
    payload = {
        "type": event_type,
        "content": content,
        "data": data or None,
    }
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def stream_agent_chat(
    *,
    chat_type: str,
    chat_id: str,
    run_id: str,
    chunks: AsyncIterator[str],
    probability: dict | None = None,
    ocr: dict | None = None,
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
    if probability:
        yield event_payload("probability_result", "", {"runId": run_id, "chatId": chat_id, "probability": probability})
    yield event_payload("status", "正在生成对方意图分析和可直接发送的回复建议...")
    answer_parts: list[str] = []
    async for chunk in chunks:
        if chunk:
            answer_parts.append(chunk)
            yield event_payload("content", chunk)
    full_answer = "".join(answer_parts)
    if on_complete:
        on_complete(full_answer)
    yield event_payload(
        "done",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "COMPLETED"},
    )
