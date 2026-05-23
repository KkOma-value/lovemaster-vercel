from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..dependencies import current_user_id, ensure_session_owner, repository
from ..storage import upload_to_supabase

router = APIRouter(prefix="/api/images")


@router.post("/upload")
async def upload_image(
    user_id: Annotated[str, Depends(current_user_id)],
    file: UploadFile = File(...),
    type: str = Form("chat"),
    conversationId: str | None = Form(None),
) -> dict:
    if conversationId:
        ensure_session_owner(conversationId, user_id)
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
