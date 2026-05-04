import json
from collections.abc import AsyncIterator


def event_payload(event_type: str, content: str = "", data: dict | None = None) -> str:
    payload = {
        "type": event_type,
        "content": content,
        "data": data or None,
    }
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def stream_basic_chat(
    *,
    chat_type: str,
    chat_id: str,
    run_id: str,
    message: str,
) -> AsyncIterator[str]:
    yield event_payload(
        "run_started",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "QUEUED"},
    )
    yield event_payload("thinking", "正在分析你的问题，准备回复建议...")
    answer = build_placeholder_answer(chat_type, message)
    for chunk in split_chunks(answer, 28):
        yield event_payload("content", chunk)
    yield event_payload(
        "done",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "COMPLETED"},
    )


async def stream_agent_chat(
    *,
    chat_type: str,
    chat_id: str,
    run_id: str,
    chunks,
    probability: dict | None = None,
) -> AsyncIterator[str]:
    yield event_payload(
        "run_started",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "QUEUED"},
    )
    yield event_payload("rag_status", "正在查阅恋爱知识库，补充参考资料...")
    if probability:
        yield event_payload("probability_result", "", {"runId": run_id, "chatId": chat_id, "probability": probability})
    yield event_payload("status", "正在生成对方意图分析和可直接发送的回复建议...")
    for chunk in chunks:
        if chunk:
            yield event_payload("content", chunk)
    yield event_payload(
        "done",
        "",
        {"runId": run_id, "chatId": chat_id, "chatType": chat_type, "status": "COMPLETED"},
    )


def build_placeholder_answer(chat_type: str, message: str) -> str:
    mode_name = "Coach" if chat_type == "coach" else "Love"
    cleaned = message.strip() or "这段关系沟通"
    return (
        f"{mode_name} 模式已收到：{cleaned}。"
        "这个 Vercel 版本已经打通前端和 Python API 的流式通道；"
        "下一步会把 Java 版的 AI 编排、RAG 和会话持久化逐步迁移过来。"
    )


def split_chunks(text: str, size: int) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)]
