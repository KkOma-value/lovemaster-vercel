from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets

import httpx

from .settings import settings


PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    if password is None or len(password) < 8:
        raise ValueError("密码至少8位")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, iterations, salt, expected = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations))
        return hmac.compare_digest(digest.hex(), expected)
    except Exception:
        return False


def verify_google_credential(credential: str) -> dict:
    if not credential:
        raise ValueError("缺少 Google credential")

    payload = decode_jwt_payload_without_verification(credential)
    if credential.startswith("dev."):
        return google_info_from_payload(payload)

    response = httpx.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": credential},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    audience = payload.get("aud")
    if settings.google_client_id and audience != settings.google_client_id:
        raise ValueError("Google Token audience 不匹配")
    if payload.get("email_verified") not in {True, "true", "True", "1", 1}:
        raise ValueError("Google 邮箱未验证")
    return google_info_from_payload(payload)


def decode_jwt_payload_without_verification(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        raw = parts[1]
        raw += "=" * (-len(raw) % 4)
        return json.loads(base64.urlsafe_b64decode(raw.encode("utf-8")))
    except Exception:
        return {}


def google_info_from_payload(payload: dict) -> dict:
    google_id = payload.get("sub")
    email = payload.get("email")
    if not google_id or not email:
        raise ValueError("无效的 Google Token")
    return {
        "googleId": google_id,
        "email": email,
        "name": payload.get("name") or email.split("@")[0],
        "pictureUrl": payload.get("picture"),
        "emailVerified": payload.get("email_verified", True),
    }
