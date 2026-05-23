import json
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..agents import agent_orchestrator
from ..dependencies import current_user_id, ensure_session_owner, repository
from ..multimodal import rewrite_service
from ..sse import stream_agent_chat

router = APIRouter(prefix="/api/ai")


class RewriteRequest(BaseModel):
    userMessage: str
    imageUrl: str | None = None
    mode: str | None = "love"


@router.get("/sessions")
def list_sessions(user_id: Annotated[str, Depends(current_user_id)], chatType: str = "loveapp") -> list:
    return repository.list_sessions(user_id, chatType)


@router.delete("/sessions/{chat_id}")
def delete_session(
    user_id: Annotated[str, Depends(current_user_id)],
    chat_id: str,
    chatType: str | None = None,
) -> dict:
    ensure_session_owner(chat_id, user_id, chatType)
    repository.delete_session(chat_id)
    return {"success": True, "message": "会话已删除"}


@router.get("/sessions/{chat_id}/messages")
def get_messages(
    user_id: Annotated[str, Depends(current_user_id)],
    chat_id: str,
    limit: int = 100,
    chatType: str | None = None,
) -> list:
    ensure_session_owner(chat_id, user_id, chatType)
    return repository.get_messages(chat_id, limit)


@router.get("/sessions/{chat_id}/images")
def get_images(
    user_id: Annotated[str, Depends(current_user_id)],
    chat_id: str,
    chatType: str | None = None,
) -> list:
    ensure_session_owner(chat_id, user_id, chatType)
    return repository.list_conversation_images(chat_id)


@router.get("/runs")
def active_runs(user_id: Annotated[str, Depends(current_user_id)]) -> list:
    return repository.list_active_runs(user_id)


@router.get("/runs/{run_id}")
def get_run(user_id: Annotated[str, Depends(current_user_id)], run_id: str) -> dict:
    run = repository.get_run(run_id)
    if not run or run.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="run 不存在")
    return run


@router.get("/love_app/chat/sse")
async def love_chat_sse(
    user_id: Annotated[str, Depends(current_user_id)],
    message: str,
    chatId: str = "",
    imageUrl: str | None = None,
) -> StreamingResponse:
    return await create_chat_stream("loveapp", message, chatId, imageUrl, user_id)


@router.get("/manus/chat")
async def coach_chat_sse(
    user_id: Annotated[str, Depends(current_user_id)],
    message: str,
    chatId: str = "",
    imageUrl: str | None = None,
) -> StreamingResponse:
    return await create_chat_stream("coach", message, chatId, imageUrl, user_id)


async def create_chat_stream(
    chat_type: str,
    message: str,
    chat_id: str,
    image_url: str | None,
    user_id: str,
) -> StreamingResponse:
    effective_chat_id = chat_id or f"chat_{uuid4().hex}"
    repository.ensure_conversation(
        user_id=user_id,
        chat_type=chat_type,
        chat_id=effective_chat_id,
        title=message,
    )
    repository.add_message(effective_chat_id, "user", message, image_url=image_url)
    run = repository.create_run(
        user_id=user_id,
        chat_id=effective_chat_id,
        chat_type=chat_type,
        request_message=message,
        image_url=image_url,
    )
    run_id = run["id"]
    progress_events: list[dict] = []
    if chat_type == "coach":
        chunk_iter, ocr, progress_events = await agent_orchestrator.coach_stream(
            message, image_url=image_url, chat_id=effective_chat_id
        )
        probability = None
    else:
        chunk_iter, probability, ocr = await agent_orchestrator.love_stream(
            message, image_url=image_url, chat_id=effective_chat_id
        )
    return StreamingResponse(
        stream_agent_chat(
            chat_type=chat_type,
            chat_id=effective_chat_id,
            run_id=run_id,
            chunks=chunk_iter,
            probability=probability,
            ocr=ocr,
            progress_events=progress_events,
            on_complete=lambda answer: _persist_answer(effective_chat_id, run_id, answer, probability),
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _persist_answer(chat_id: str, run_id: str, answer: str, probability: dict | None) -> None:
    repository.add_message(
        chat_id,
        "assistant",
        answer,
        probability_json=json.dumps(probability, ensure_ascii=False) if probability else None,
    )
    repository.complete_run(run_id, answer)


@router.post("/rewrite")
async def rewrite(payload: RewriteRequest) -> dict:
    return await rewrite_service.optimize(payload.userMessage, payload.imageUrl, payload.mode or "love")
