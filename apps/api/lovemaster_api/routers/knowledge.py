from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import current_user_id, repository

router = APIRouter(prefix="/api/ai/knowledge")


@router.post("/candidates")
def create_candidate(payload: dict, user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    return repository.create_knowledge_candidate(user_id, payload)


@router.get("/candidates")
def list_candidates(
    user_id: Annotated[str, Depends(current_user_id)],
    status: str = "pending_review",
    page: int = 0,
    size: int = 20,
) -> list:
    return repository.list_knowledge_candidates(status, page, size)


@router.post("/candidates/{candidate_id}/approve")
def approve_candidate(
    user_id: Annotated[str, Depends(current_user_id)],
    candidate_id: str,
    payload: dict | None = None,
) -> dict:
    candidate = repository.update_candidate_status(
        candidate_id,
        "approved",
        (payload or {}).get("reviewerId") or user_id,
        (payload or {}).get("note"),
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="candidate 不存在")
    return {"id": candidate["id"], "status": candidate["status"], "message": "Candidate approved"}


@router.post("/candidates/{candidate_id}/reject")
def reject_candidate(
    user_id: Annotated[str, Depends(current_user_id)],
    candidate_id: str,
    payload: dict | None = None,
) -> dict:
    candidate = repository.update_candidate_status(
        candidate_id,
        "rejected",
        (payload or {}).get("reviewerId") or user_id,
        (payload or {}).get("reason"),
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="candidate 不存在")
    return {"id": candidate["id"], "status": candidate["status"], "message": "Candidate rejected"}


@router.post("/feedback-events")
def create_feedback(payload: dict, user_id: Annotated[str, Depends(current_user_id)]) -> dict:
    event = repository.create_feedback_event(user_id, payload)
    return {**event, "success": True}


@router.get("/strategy-scores")
def strategy_scores(
    user_id: Annotated[str, Depends(current_user_id)],
    topicKey: str | None = None,
    limit: int = 20,
) -> list:
    return repository.list_strategy_scores(topicKey, limit)
