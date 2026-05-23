from __future__ import annotations

from .repository import PostgresRepository
from .settings import settings


def run_migrations(database_url: str | None = None) -> None:
    effective_url = database_url or settings.effective_database_url
    if not effective_url:
        raise RuntimeError("DATABASE_URL, DB_POOLER_URL, or DB_URL is required to run migrations")
    PostgresRepository(effective_url).run_migrations()


if __name__ == "__main__":
    run_migrations()
