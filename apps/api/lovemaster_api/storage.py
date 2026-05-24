from __future__ import annotations

import re
from uuid import uuid4

from fastapi import UploadFile

from .ai_client import get_client
from .settings import settings


def sanitize_path_part(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", value.strip())
    return cleaned.strip("._") or "file"


def build_storage_path(user_id: str, image_type: str, filename: str | None) -> str:
    safe_user = sanitize_path_part(user_id)
    safe_type = sanitize_path_part(image_type or "chat")
    safe_name = sanitize_path_part((filename or "image").split("/")[-1].split("\\")[-1])
    if "." not in safe_name:
        safe_name = f"{safe_name}.bin"
    return f"images/{safe_user}/{safe_type}/{uuid4().hex}-{safe_name}"


def public_storage_url(supabase_url: str, bucket: str, storage_path: str) -> str:
    return f"{supabase_url.rstrip()}/storage/v1/object/public/{bucket}/{storage_path}"


async def upload_to_supabase(file: UploadFile, user_id: str, image_type: str) -> dict:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase Storage 未配置")
    content = await file.read()
    content_type = file.content_type or "application/octet-stream"
    storage_path = build_storage_path(user_id, image_type, file.filename)
    upload_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{settings.supabase_storage_bucket}/{storage_path}"
    )
    response = await get_client().post(
        upload_url,
        content=content,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "x-upsert": "true",
            "Content-Type": content_type,
        },
        timeout=30,
    )
    response.raise_for_status()
    return {
        "url": public_storage_url(settings.supabase_url, settings.supabase_storage_bucket, storage_path),
        "storagePath": storage_path,
        "fileName": storage_path.rsplit("/", 1)[-1],
        "fileSize": len(content),
        "contentType": content_type,
    }
