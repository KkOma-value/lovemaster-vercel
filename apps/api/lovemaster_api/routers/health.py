from fastapi import APIRouter

from ..settings import settings

router = APIRouter()


@router.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}
