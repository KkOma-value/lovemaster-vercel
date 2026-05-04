import os

os.environ["AI_PROVIDER"] = "fake"

from lovemaster_api.repository import InMemoryRepository
from lovemaster_api import repository as repository_module


def test_repository_persists_user_session_messages_and_run():
    repo = InMemoryRepository()

    user = repo.create_user(email="demo@example.com", password_hash="hashed", name="Demo")
    repo.save_refresh_token(user["id"], "refresh-token", expires_at_iso="2099-01-01T00:00:00+00:00")

    session = repo.ensure_conversation(
        user_id=user["id"],
        chat_type="loveapp",
        chat_id="chat_1",
        title="hello world",
    )
    repo.add_message("chat_1", "user", "hello", image_url="https://example.com/a.png")
    repo.add_message("chat_1", "assistant", "hi")

    run = repo.create_run(
        user_id=user["id"],
        chat_id="chat_1",
        chat_type="loveapp",
        request_message="hello",
        image_url=None,
    )
    repo.complete_run(run["id"], "hi")

    assert repo.find_user_by_email("demo@example.com")["id"] == user["id"]
    assert repo.find_user_by_refresh_token("refresh-token")["id"] == user["id"]
    assert repo.list_sessions(user["id"], "loveapp") == [{"id": "chat_1", "title": "hello world"}]
    assert repo.get_messages("chat_1")[0]["imageUrl"] == "https://example.com/a.png"
    assert repo.get_run(run["id"])["status"] == "COMPLETED"
    assert repo.list_active_runs(user["id"]) == []
    assert session["title"] == "hello world"


def test_configured_database_connection_failure_is_not_silently_in_memory(monkeypatch):
    monkeypatch.setattr(repository_module.settings, "database_url", "postgresql://demo.invalid/postgres")
    monkeypatch.setattr(repository_module.settings, "db_pooler_url", None)
    monkeypatch.setattr(repository_module.settings, "db_url", None)

    class BrokenPostgresRepository:
        def __init__(self, database_url: str) -> None:
            raise RuntimeError("database unavailable")

    monkeypatch.setattr(repository_module, "PostgresRepository", BrokenPostgresRepository)

    try:
        repository_module.create_repository()
    except RuntimeError as exc:
        assert "database unavailable" in str(exc)
    else:
        raise AssertionError("configured database failures must not fall back to memory")
