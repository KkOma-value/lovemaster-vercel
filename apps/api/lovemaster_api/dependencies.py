from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

import jwt
from fastapi import Header, HTTPException

from .repository import repository
from .settings import settings


def create_token(user_id: str, expires_seconds: int, token_type: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "typ": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_seconds)).timestamp()),
    }
    if token_type == "refresh":
        payload["jti"] = uuid4().hex
    return jwt.encode(payload, settings.effective_jwt_secret, algorithm="HS256")


def auth_payload(user: dict, *, revoke_existing_refresh_tokens: bool = False) -> dict:
    if revoke_existing_refresh_tokens:
        repository.delete_refresh_tokens_for_user(user["id"])
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
        "user": user_payload(user),
    }


def decode_token(token: str | None, expected_type: str | None = None) -> dict | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.effective_jwt_secret, algorithms=["HS256"])
        if expected_type and payload.get("typ") != expected_type:
            return None
        if not payload.get("sub"):
            return None
        return payload
    except jwt.PyJWTError:
        return None


def decode_user_id(token: str | None, expected_type: str | None = "access") -> str | None:
    payload = decode_token(token, expected_type)
    if not payload:
        return None
    return str(payload["sub"])


def current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    token: str | None = None,
) -> str:
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:]
    user_id = decode_user_id(bearer or token)
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    return user_id


def user_payload(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "avatarUrl": user.get("avatarUrl"),
    }


def ensure_session_owner(chat_id: str, user_id: str, chat_type: str | None = None) -> None:
    if not repository.find_session(chat_id, user_id, chat_type):
        raise HTTPException(status_code=404, detail="会话不存在")
