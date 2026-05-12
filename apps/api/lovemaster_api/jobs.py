from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timedelta

from .repository import repository as default_repository

logger = logging.getLogger(__name__)

# Minimum content length for a message to be considered knowledge-worthy
MIN_CONTENT_LENGTH = 100
# Minimum number of positive feedback events to trigger reinforcement
REINFORCEMENT_THRESHOLD = 3


def auto_approve_candidates(repo=default_repository, threshold: float = 1.5) -> int:
    changed = 0
    candidates = repo.list_knowledge_candidates("pending_review", 0, 200)
    for candidate in candidates:
        if float(candidate.get("triggerScore") or 0) >= threshold:
            updated = repo.update_candidate_status(candidate["id"], "approved", "auto-approval", "score threshold")
            if updated:
                changed += 1
    return changed


def distill_conversations(repo=default_repository, hours: int = 1) -> int:
    """Extract knowledge candidates from recent assistant messages.

    Scans messages from the last N hours and creates candidates for
    messages that are long enough to contain useful knowledge.
    """
    created = 0
    # Get all recent sessions and their messages
    # This is a simplified version - in production, you'd query by timestamp
    try:
        # Check existing candidates to avoid duplicates
        existing = repo.list_knowledge_candidates("pending_review", 0, 1000)
        existing_run_ids = {c.get("sourceRunId") for c in existing if c.get("sourceRunId")}
        existing_approved = repo.list_knowledge_candidates("approved", 0, 1000)
        existing_run_ids.update(c.get("sourceRunId") for c in existing_approved if c.get("sourceRunId"))

        # Get recent runs
        for run in _get_recent_runs(repo, hours):
            run_id = run.get("id")
            if not run_id or run_id in existing_run_ids:
                continue

            answer = run.get("partialResponse") or ""
            if len(answer) < MIN_CONTENT_LENGTH:
                continue

            # Extract key topics from the answer
            question = run.get("requestMessage") or ""
            if not question:
                continue

            repo.create_knowledge_candidate(
                "system",
                {
                    "chatId": run.get("chatId"),
                    "runId": run_id,
                    "question": question,
                    "answer": answer,
                    "triggerType": "distill",
                    "triggerScore": 1.0,
                    "status": "pending_review",
                },
            )
            created += 1
    except Exception:
        logger.warning("Distill job failed", exc_info=True)
    return created


def reinforce_knowledge(repo=default_repository) -> int:
    """Aggregate positive feedback events and promote high-score candidates.

    Scans unprocessed feedback events and creates reinforcement candidates
    for topics with enough positive signals.
    """
    promoted = 0
    try:
        # Get feedback events and group by candidate
        candidate_scores: dict[str, float] = {}
        candidates = repo.list_knowledge_candidates("pending_review", 0, 1000)
        candidate_map = {c["id"]: c for c in candidates}

        # In a real implementation, you'd query feedback events from the DB
        # For now, check candidates with high trigger scores
        for candidate in candidates:
            score = float(candidate.get("triggerScore") or 0)
            if score >= REINFORCEMENT_THRESHOLD:
                # Promote to approved
                updated = repo.update_candidate_status(
                    candidate["id"],
                    "approved",
                    "reinforcement",
                    f"Auto-promoted: score {score} >= {REINFORCEMENT_THRESHOLD}",
                )
                if updated:
                    promoted += 1
    except Exception:
        logger.warning("Reinforcement job failed", exc_info=True)
    return promoted


def _get_recent_runs(repo, hours: int) -> list[dict]:
    """Get completed runs from the last N hours."""
    # PostgresRepository has a dedicated SQL method
    if hasattr(repo, "list_recent_completed_runs"):
        return repo.list_recent_completed_runs(hours)
    # InMemoryRepository fallback: filter by finishedAt
    cutoff = (datetime.now(UTC) - timedelta(hours=hours)).isoformat()
    runs = []
    for run in repo.runs.values() if hasattr(repo, "runs") else []:
        if run.get("status") == "COMPLETED":
            finished = run.get("finishedAt") or ""
            if finished >= cutoff:
                runs.append(run)
    return runs


def run_knowledge_jobs(repo=default_repository) -> dict:
    auto_approved = auto_approve_candidates(repo)
    distilled = distill_conversations(repo)
    reinforced = reinforce_knowledge(repo)
    return {
        "autoApproved": auto_approved,
        "distilled": distilled,
        "reinforced": reinforced,
    }
