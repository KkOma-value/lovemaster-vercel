import os
from pathlib import Path

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


def test_configured_database_creates_postgres_adapter_without_running_migrations(monkeypatch):
    monkeypatch.setattr(repository_module.settings, "database_url", "postgresql://demo.invalid/postgres")
    monkeypatch.setattr(repository_module.settings, "db_pooler_url", None)
    monkeypatch.setattr(repository_module.settings, "db_url", None)

    class BrokenPostgresRepository:
        created_with = None

        def __init__(self, database_url: str) -> None:
            self.database_url = database_url
            BrokenPostgresRepository.created_with = database_url

    monkeypatch.setattr(repository_module, "PostgresRepository", BrokenPostgresRepository)

    repo = repository_module.create_repository()

    assert isinstance(repo, BrokenPostgresRepository)
    assert BrokenPostgresRepository.created_with == "postgresql://demo.invalid/postgres"


def test_postgres_repository_is_not_an_inmemory_subclass():
    assert not issubclass(repository_module.PostgresRepository, InMemoryRepository)


def test_migration_uses_java_compatible_knowledge_table_names_and_columns():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "001_initial_schema.sql"
    sql = migration.read_text(encoding="utf-8")

    assert "create table if not exists wiki_candidate" in sql
    assert "create table if not exists wiki_feedback_event" in sql
    assert "create table if not exists wiki_strategy_score" in sql
    assert "wiki_candidates" not in sql
    assert "wiki_feedback_events" not in sql
    assert "wiki_strategy_scores" not in sql
    assert "schema_version" in sql
    assert "rejected_reason" in sql
    assert "processed boolean" in sql
    assert "processed_at" in sql
    assert "unique (topic_key, strategy_id)" in sql.lower()


def test_explicit_migration_entrypoint_runs_postgres_migrations(monkeypatch):
    from lovemaster_api import migrate

    calls = []
    monkeypatch.setattr(migrate.settings, "database_url", "postgresql://db.example/postgres")
    monkeypatch.setattr(migrate.settings, "db_pooler_url", None)
    monkeypatch.setattr(migrate.settings, "db_url", None)

    class RecordingPostgresRepository:
        def __init__(self, database_url: str) -> None:
            calls.append(("init", database_url))

        def run_migrations(self) -> None:
            calls.append(("run", None))

    monkeypatch.setattr(migrate, "PostgresRepository", RecordingPostgresRepository)

    migrate.run_migrations()

    assert calls == [("init", "postgresql://db.example/postgres"), ("run", None)]
