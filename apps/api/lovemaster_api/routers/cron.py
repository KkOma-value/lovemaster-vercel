from fastapi import APIRouter, HTTPException, Request

from ..dependencies import repository
from ..jobs import distill_conversations, reinforce_knowledge, run_knowledge_jobs
from ..settings import settings

router = APIRouter(prefix="/api/cron")


def _verify_cron_auth(request: Request) -> None:
    if not settings.cron_secret:
        raise HTTPException(status_code=403, detail="Cron secret not configured")
    auth_header = request.headers.get("authorization", "")
    expected = f"Bearer {settings.cron_secret}"
    if auth_header != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/knowledge")
def knowledge_cron(request: Request) -> dict:
    _verify_cron_auth(request)
    return run_knowledge_jobs(repository)


@router.get("/distill")
def distill_cron(request: Request) -> dict:
    _verify_cron_auth(request)
    return {"distilled": distill_conversations(repository)}


@router.get("/reinforce")
def reinforce_cron(request: Request) -> dict:
    _verify_cron_auth(request)
    return {"reinforced": reinforce_knowledge(repository)}
