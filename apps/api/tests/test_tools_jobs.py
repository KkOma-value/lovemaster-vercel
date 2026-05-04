import os

os.environ["AI_PROVIDER"] = "fake"

from lovemaster_api.jobs import auto_approve_candidates
from lovemaster_api.repository import InMemoryRepository
from lovemaster_api.tools import ToolRegistry


def test_tool_registry_excludes_mcp_and_terminal_tools():
    registry = ToolRegistry()

    assert "web_search" in registry.names()
    assert "web_scrape" in registry.names()
    assert "terminal" not in registry.names()
    assert "mcp" not in registry.names()


def test_auto_approve_candidates_moves_high_signal_candidate():
    repo = InMemoryRepository()
    candidate = repo.create_knowledge_candidate(
        "user_1",
        {
            "question": "怎么温和邀约",
            "answer": "先接住情绪",
            "triggerType": "copy",
            "triggerScore": 2.0,
            "status": "pending_review",
        },
    )

    changed = auto_approve_candidates(repo, threshold=1.5)

    assert changed == 1
    assert repo.knowledge_candidates[candidate["id"]]["status"] == "approved"
