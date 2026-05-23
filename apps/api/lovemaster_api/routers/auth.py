from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from ..auth import hash_password, verify_google_credential, verify_password
from ..dependencies import auth_payload, current_user_id, decode_token, repository, user_payload

router = APIRouter(prefix="/api/auth")


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


@router.post("/register", status_code=status.HTTP_201_CREATED)
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


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    email = payload.email.lower()
    user = repository.find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    if not verify_password(payload.password, user.get("passwordHash")):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return auth_payload(user)


@router.post("/refresh")
def refresh(payload: RefreshRequest) -> dict:
    refresh_token = payload.refreshToken or payload.token
    if not decode_token(refresh_token, "refresh"):
        raise HTTPException(status_code=401, detail="刷新令牌无效")
    user = repository.find_user_by_refresh_token(refresh_token or "")
    if not user:
        raise HTTPException(status_code=401, detail="刷新令牌无效")
    return auth_payload(user, revoke_existing_refresh_tokens=True)


@router.post("/logout")
def logout(user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    repository.delete_refresh_tokens_for_user(user_id)
    return {"message": "已登出"}


@router.get("/me")
def me(user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    user = repository.find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="未登录")
    return user_payload(user)


@router.post("/google")
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


@router.post("/set-password")
def set_password(payload: dict, user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    user = repository.find_user_by_id(user_id)
    if user:
        try:
            repository.update_user_password(user_id, hash_password(payload.get("password", "")))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": "密码设置成功"}
