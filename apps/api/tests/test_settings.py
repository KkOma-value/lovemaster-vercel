from lovemaster_api.settings import Settings


def test_effective_database_url_accepts_java_style_supabase_config():
    settings = Settings(
        db_pooler_url="jdbc:postgresql://db.example.supabase.co:5432/postgres?sslmode=require",
        db_username="postgres.example",
        db_password="secret pass",
    )

    assert settings.effective_database_url == (
        "postgresql://postgres.example:secret%20pass@db.example.supabase.co:5432/postgres?sslmode=require"
    )


def test_lovemaster_prefixed_jwt_secret_is_supported():
    settings = Settings(jwt_secret="", lovemaster_jwt_secret="deploy-secret")

    assert settings.effective_jwt_secret == "deploy-secret"


def test_empty_jwt_secret_uses_safe_dev_default():
    settings = Settings(jwt_secret="", lovemaster_jwt_secret="")

    assert settings.effective_jwt_secret == "dev-only-change-me"


def test_lovemaster_prefixed_cors_origins_is_supported():
    settings = Settings(cors_origins="", lovemaster_cors_origins="https://example.com")

    assert settings.effective_cors_origins == "https://example.com"
