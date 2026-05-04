from urllib.parse import quote, urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "lovemaster-api"
    jwt_secret: str = "dev-only-change-me"
    lovemaster_jwt_secret: str | None = None
    access_token_expire_seconds: int = 1800
    refresh_token_expire_seconds: int = 604800
    cors_origins: str = "*"
    lovemaster_cors_origins: str | None = None
    database_url: str | None = None
    db_pooler_url: str | None = None
    db_url: str | None = None
    db_username: str | None = None
    db_password: str | None = None
    dashscope_api_key: str | None = None
    nvidia_api_key: str | None = None
    nvidia_base_url: str = "https://integrate.api.nvidia.com"
    nvidia_model_rewrite: str = "qwen/qwen3.5-122b-a10b"
    nvidia_model_tools: str = "nvidia/llama-3.3-nemotron-super-49b-v1.5"
    nvidia_model_brain: str = "moonshotai/kimi-k2-thinking"
    nvidia_model_vision: str = "microsoft/phi-4-multimodal-instruct"
    dify_api_base_url: str = "https://api.dify.ai/v1"
    dify_dataset_key: str | None = None
    dify_dataset_id: str | None = None
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "conversation-images"
    google_client_id: str | None = None
    search_api_key: str | None = None
    pexels_api_key: str | None = None
    spring_mail_host: str = "smtp.qq.com"
    spring_mail_port: int = 465
    spring_mail_username: str | None = None
    spring_mail_password: str | None = None
    cron_secret: str | None = None
    ai_provider: str = "auto"
    app_knowledge_wiki_enabled: bool = True
    app_knowledge_wiki_root: str = "knowledge/wiki"
    app_knowledge_wiki_top_n: int = 3
    app_knowledge_wiki_max_chars_per_page: int = 400
    app_knowledge_wiki_total_budget_chars: int = 2000
    app_knowledge_wiki_title_boost: float = 2.0

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_prefix="",
        extra="ignore",
    )

    @property
    def effective_database_url(self) -> str | None:
        return normalize_database_url(
            self.database_url or self.db_pooler_url or self.db_url,
            self.db_username,
            self.db_password,
        )

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret or self.lovemaster_jwt_secret or "dev-only-change-me"

    @property
    def effective_cors_origins(self) -> str:
        return self.cors_origins or self.lovemaster_cors_origins or "*"


settings = Settings()


def normalize_database_url(url: str | None, username: str | None = None, password: str | None = None) -> str | None:
    if not url:
        return None

    normalized = url.replace("jdbc:", "", 1) if url.startswith("jdbc:") else url
    parsed = urlparse(normalized)
    if parsed.username or not username:
        return normalized

    auth = quote(username, safe="")
    if password:
        auth = f"{auth}:{quote(password, safe='')}"

    host = parsed.hostname or ""
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    netloc = f"{auth}@{host}"
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"

    return urlunparse(parsed._replace(netloc=netloc))
