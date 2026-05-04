# Java To Vercel Config Mapping

The migration keeps the Java environment variable names where possible so Vercel can be configured with the same keys.

| Java key | Python/Vercel status |
| --- | --- |
| `DB_POOLER_URL` | Used as database URL fallback |
| `DB_URL` | Used as database URL fallback |
| `DATABASE_URL` | Preferred database URL |
| `DB_USERNAME` / `DB_PASSWORD` | Documented for compatibility; URL-based connections are preferred |
| `JWT_SECRET` | Used for JWT signing |
| `DASHSCOPE_API_KEY` | Loaded for later AI orchestration migration |
| `NVIDIA_API_KEY` / `NVIDIA_BASE_URL` | Loaded for later AI orchestration migration |
| `DIFY_API_BASE_URL` / `DIFY_DATASET_KEY` / `DIFY_DATASET_ID` | Loaded for later RAG migration |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Loaded for image/storage migration |
| `GOOGLE_CLIENT_ID` | Loaded for Google auth verification migration |
| `AI_PROVIDER` | `auto` uses NVIDIA when configured; `fake` keeps local tests deterministic |
| `APP_MCP_AUTOSTART` / MCP client keys | Intentionally omitted |
| `APP_FILE_SAVE_DIR` | Intentionally not used for persistent storage on Vercel |
| `SPRING_MAIL_*` | Used by email tool when configured |
| `SEARCH_API_KEY` / `PEXELS_API_KEY` | Used by web/image search tools when configured |

Secret values live only in `.env.local` locally or in the Vercel project environment.
