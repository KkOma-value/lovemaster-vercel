# Lovemaster Vercel

This is the Vercel-oriented migration workspace for Lovemaster.

The React frontend in `apps/web` is copied from the existing `springai-front-react` app and should remain visually unchanged. The Python API in `apps/api` provides a FastAPI skeleton that keeps the existing frontend `/api/...` contract while the Java backend logic is migrated incrementally.

## Layout

```text
lovemaster-vercel/
├── api/index.py                  # Vercel Python Function entry
├── apps/api/lovemaster_api/      # FastAPI implementation
├── apps/api/tests/               # API contract tests
├── apps/web/                     # Existing React/Vite frontend
├── docs/                         # Migration docs
├── requirements.txt              # Vercel Python dependencies
└── vercel.json                   # Vercel routing and build config
```

## Local API Tests

```powershell
$env:PYTHONPATH='D:\JavaCode\lovemaster-vercel\apps\api'
python -m pytest apps\api\tests -q
```

## Frontend Build

```powershell
npm --prefix apps/web install
npm --prefix apps/web run build
```

## Configuration Migration

The local `.env.local` file was migrated from the Java project `.env`. It is gitignored and should not be committed.

The Python API accepts the existing Java variable names for the first migration slice:

- `DB_POOLER_URL` / `DB_URL` / `DATABASE_URL`
- `JWT_SECRET`
- `DASHSCOPE_API_KEY`
- `NVIDIA_API_KEY` / `NVIDIA_BASE_URL`
- `DIFY_API_BASE_URL` / `DIFY_DATASET_KEY` / `DIFY_DATASET_ID`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET`
- `GOOGLE_CLIENT_ID`

## Deployment Notes

- Vercel routes `/api/*` to `api/index.py`.
- The frontend is built from `apps/web` and emitted to `apps/web/dist`.
- The API uses Postgres when `DATABASE_URL`, `DB_POOLER_URL`, or `DB_URL` is configured. Without a reachable database it falls back to in-memory storage for local bootstrapping.
- `AI_PROVIDER=auto` uses the migrated NVIDIA OpenAI-compatible configuration when `NVIDIA_API_KEY` is present. Use `AI_PROVIDER=fake` for deterministic local tests.
- RAG now checks local Markdown under `APP_KNOWLEDGE_WIKI_ROOT` and Dify when `DIFY_DATASET_KEY` / `DIFY_DATASET_ID` are present.
- Image upload keeps the existing frontend API contract and uploads to Supabase Storage when configured.
- MCP and terminal operation capabilities are intentionally omitted for the Vercel web deployment.
- MCP autostart, terminal/file tools, PDF/email tools, and background knowledge jobs are intentionally out of the first deployable skeleton.
