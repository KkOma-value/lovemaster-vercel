from __future__ import annotations

from .repository import repository as default_repository


def auto_approve_candidates(repo=default_repository, threshold: float = 1.5) -> int:
    changed = 0
    candidates = repo.list_knowledge_candidates("pending_review", 0, 200)
    for candidate in candidates:
        if float(candidate.get("triggerScore") or 0) >= threshold:
            updated = repo.update_candidate_status(candidate["id"], "approved", "auto-approval", "score threshold")
            if updated:
                changed += 1
    return changed


def run_knowledge_jobs(repo=default_repository) -> dict:
    return {"autoApproved": auto_approve_candidates(repo)}
