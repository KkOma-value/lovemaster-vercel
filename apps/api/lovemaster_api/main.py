import json
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

import jwt
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr

from .agents import agent_orchestrator
from .ai_client import close_client
from .auth import hash_password, verify_google_credential, verify_password
from .repository import repository
from .settings import settings
from .sse import stream_agent_chat
from .storage import upload_to_supabase
from .multimodal import rewrite_service
from .jobs import distill_conversations, reinforce_knowledge, run_knowledge_jobs

# Wire repository into agent orchestrator for chat history
agent_orchestrator.set_repository(repository)


@asynccontextmanager
async def lifespan(app):
    yield
    await close_client()


app = FastAPI(title="Lovemaster API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.effective_cors_origins == "*" else settings.effective_cors_origins.split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str | None = None
    token: str | None = None


class RewriteRequest(BaseModel):
    userMessage: str
    imageUrl: str | None = None
    mode: str | None = "love"


def create_token(user_id: str, expires_seconds: int, token_type: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "typ": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_seconds)).timestamp()),
    }
    return jwt.encode(payload, settings.effective_jwt_secret, algorithm="HS256")


def auth_payload(user: dict) -> dict:
    access_token = create_token(user["id"], settings.access_token_expire_seconds, "access")
    refresh_token = create_token(user["id"], settings.refresh_token_expire_seconds, "refresh")
    repository.save_refresh_token(
        user["id"],
        refresh_token,
        (datetime.now(UTC) + timedelta(seconds=settings.refresh_token_expire_seconds)).isoformat(),
    )
    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "token": access_token,
        "user": {
            "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "avatarUrl": user.get("avatarUrl"),
        },
    }


def decode_user_id(token: str | None) -> str:
    if not token:
        return "anonymous"
    try:
        payload = jwt.decode(token, settings.effective_jwt_secret, algorithms=["HS256"])
        return str(payload.get("sub") or "anonymous")
    except jwt.PyJWTError:
        return "anonymous"


def current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    token: str | None = None,
) -> str:
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:]
    return decode_user_id(bearer or token)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> dict:
    email = payload.email.lower()
    existing = repository.find_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="用户已存在")
    try:
        password_hash = hash_password(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user = repository.create_user(email=email, password_hash=password_hash, name=payload.name)
    return auth_payload(user)


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict:
    email = payload.email.lower()
    user = repository.find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    if not verify_password(payload.password, user.get("passwordHash")):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return auth_payload(user)


@app.post("/api/auth/refresh")
def refresh(payload: RefreshRequest) -> dict:
    refresh_token = payload.refreshToken or payload.token
    user = repository.find_user_by_refresh_token(refresh_token or "")
    if not user:
        raise HTTPException(status_code=401, detail="刷新令牌无效")
    return auth_payload(user)


@app.post("/api/auth/logout")
def logout() -> dict:
    return {"message": "已登出"}


@app.get("/api/auth/me")
def me(user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    user = repository.find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="未登录")
    return auth_payload(user)["user"]


@app.post("/api/auth/google")
def google_login(payload: dict) -> dict:
    credential = payload.get("credential")
    if not credential:
        raise HTTPException(status_code=400, detail="缺少 Google credential")
    try:
        google_user = verify_google_credential(credential)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    email = google_user["email"].lower()
    user = repository.find_user_by_email(email)
    if not user:
        user = repository.create_user(
            email=email,
            password_hash=None,
            name=google_user.get("name"),
            google_id=google_user.get("googleId"),
            avatar_url=google_user.get("pictureUrl"),
            auth_provider="google",
            needs_password=True,
        )
    return auth_payload(user)


@app.post("/api/auth/set-password")
def set_password(payload: dict, user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    user = repository.find_user_by_id(user_id)
    if user:
        try:
            repository.update_user_password(user_id, hash_password(payload.get("password", "")))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": "密码设置成功"}


@app.get("/api/ai/sessions")
def list_sessions(chatType: str = "loveapp", user_id: Annotated[str, Depends(current_user_id)] = "anonymous") -> list:
    return repository.list_sessions(user_id, chatType)


@app.delete("/api/ai/sessions/{chat_id}")
def delete_session(chat_id: str) -> dict:
    repository.delete_session(chat_id)
    return {"success": True, "message": "会话已删除"}


@app.get("/api/ai/sessions/{chat_id}/messages")
def get_messages(chat_id: str, limit: int = 100) -> list:
    return repository.get_messages(chat_id, limit)


@app.get("/api/ai/sessions/{chat_id}/images")
def get_images(chat_id: str) -> list:
    return repository.list_conversation_images(chat_id)


@app.get("/api/ai/runs")
def active_runs(user_id: Annotated[str, Depends(current_user_id)]) -> list:
    return repository.list_active_runs(user_id)


@app.get("/api/ai/runs/{run_id}")
def get_run(run_id: str) -> dict:
    run = repository.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="run 不存在")
    return run


@app.get("/api/ai/love_app/chat/sse")
async def love_chat_sse(
    message: str,
    chatId: str = "",
    imageUrl: str | None = None,
    user_id: Annotated[str, Depends(current_user_id)] = "anonymous",
) -> StreamingResponse:
    return await create_chat_stream("loveapp", message, chatId, imageUrl, user_id)


@app.get("/api/ai/manus/chat")
async def coach_chat_sse(
    message: str,
    chatId: str = "",
    imageUrl: str | None = None,
    user_id: Annotated[str, Depends(current_user_id)] = "anonymous",
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
    if chat_type == "coach":
        chunk_iter, ocr = await agent_orchestrator.coach_stream(
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


@app.post("/api/ai/rewrite")
async def rewrite(payload: RewriteRequest) -> dict:
    return await rewrite_service.optimize(payload.userMessage, payload.imageUrl, payload.mode or "love")


@app.post("/api/ai/knowledge/candidates")
def create_candidate(payload: dict) -> dict:
    return repository.create_knowledge_candidate("anonymous", payload)


@app.get("/api/ai/knowledge/candidates")
def list_candidates(status: str = "pending_review", page: int = 0, size: int = 20) -> list:
    return repository.list_knowledge_candidates(status, page, size)


@app.post("/api/ai/knowledge/candidates/{candidate_id}/approve")
def approve_candidate(candidate_id: str, payload: dict | None = None) -> dict:
    candidate = repository.update_candidate_status(
        candidate_id,
        "approved",
        (payload or {}).get("reviewerId") or "anonymous",
        (payload or {}).get("note"),
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="candidate 不存在")
    return {"id": candidate["id"], "status": candidate["status"], "message": "Candidate approved"}


@app.post("/api/ai/knowledge/candidates/{candidate_id}/reject")
def reject_candidate(candidate_id: str, payload: dict | None = None) -> dict:
    candidate = repository.update_candidate_status(
        candidate_id,
        "rejected",
        (payload or {}).get("reviewerId") or "anonymous",
        (payload or {}).get("reason"),
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="candidate 不存在")
    return {"id": candidate["id"], "status": candidate["status"], "message": "Candidate rejected"}


@app.post("/api/ai/knowledge/feedback-events")
def create_feedback(payload: dict) -> dict:
    event = repository.create_feedback_event("anonymous", payload)
    return {**event, "success": True}


@app.get("/api/ai/knowledge/strategy-scores")
def strategy_scores(topicKey: str | None = None, limit: int = 20) -> list:
    return repository.list_strategy_scores(topicKey, limit)


def _verify_cron_auth(request: Request) -> None:
    if not settings.cron_secret:
        raise HTTPException(status_code=403, detail="Cron secret not configured")
    auth_header = request.headers.get("authorization", "")
    expected = f"Bearer {settings.cron_secret}"
    if auth_header != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/api/cron/knowledge")
def knowledge_cron(request: Request) -> dict:
    _verify_cron_auth(request)
    return run_knowledge_jobs(repository)


@app.get("/api/cron/distill")
def distill_cron(request: Request) -> dict:
    _verify_cron_auth(request)
    return {"distilled": distill_conversations(repository)}


@app.get("/api/cron/reinforce")
def reinforce_cron(request: Request) -> dict:
    _verify_cron_auth(request)
    return {"reinforced": reinforce_knowledge(repository)}


@app.post("/api/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    type: str = Form("chat"),
    conversationId: str | None = Form(None),
    user_id: Annotated[str, Depends(current_user_id)] = "anonymous",
) -> dict:
    try:
        stored = await upload_to_supabase(file, user_id, type)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"图片上传失败: {exc}") from exc
    if conversationId:
        repository.add_conversation_image(
            conversation_id=conversationId,
            file_name=stored["fileName"],
            file_type=stored["contentType"],
            public_url=stored["url"],
            storage_path=stored["storagePath"],
        )
    return {
        "id": stored["storagePath"],
        "url": stored["url"],
        "fileName": stored["fileName"],
        "fileSize": stored["fileSize"],
    }


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def api_fallback(path: str, request: Request) -> Response:
    if request.method == "OPTIONS":
        return Response(status_code=204)
    return JSONResponse(status_code=404, content={"error": f"API route not implemented: /api/{path}"})
