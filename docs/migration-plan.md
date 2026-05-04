# Lovemaster Vercel Migration Plan

## Goal

Move Lovemaster toward a Vercel-compatible architecture without changing the existing frontend UI.

## Current Phase

Phase 1 creates a deployable skeleton:

- React/Vite frontend copied unchanged into `apps/web`.
- Python/FastAPI backend in `apps/api`.
- Vercel Function entry at `api/index.py`.
- Compatibility routes for existing `/api/auth/*`, `/api/ai/*`, and `/api/images/*` callers.
- API contract tests for health, auth payloads, sessions, and SSE event format.
- Java `.env` keys copied into local `.env.local` without committing secret values.
- Java-compatible Postgres schema created in `apps/api/migrations/001_initial_schema.sql`.
- Storage abstraction added with in-memory fallback and Postgres support when a database URL is available.
- CRUD migration now covers sessions, messages, runs, knowledge candidates, feedback events, and strategy score reads.
- RAG migration now includes local Wiki Markdown retrieval, Dify Dataset retrieval, merge, cache, and basic prompt-injection filtering.
- Love/Coach Agent migration now routes SSE output through Python `AgentOrchestrator` with RAG context and OpenAI-compatible NVIDIA calls when configured.
- Production authentication now uses PBKDF2-HMAC password hashes and Google token verification.
- Image upload now keeps the existing `/api/images/upload` frontend contract and stores files in Supabase Storage when configured.
- OCR, rewrite, and probability analysis services now exist in Python and emit frontend-compatible probability SSE events.
- Non-terminal tools migrated as Vercel-safe HTTP/Python utilities: web search, web scrape, image search, email, and text-based document generation.
- Knowledge automation is exposed through `/api/cron/knowledge` and scheduled in `vercel.json`.

## Next Backend Migration Order

1. Verify the migrated database URL against the target Supabase/Postgres instance.
2. Hash passwords with a production password hasher before enabling real registration traffic.
3. Run a real Supabase/Postgres smoke test using production-like env vars.
4. Add full Dify retry/backoff and response telemetry equivalent to Java.
5. Expand Wiki content; the Java project currently only contains `knowledge/wiki/topic-schema.yml`, so local Wiki retrieval has little production value until Markdown pages are added.
6. Decide whether PDF generation should remain text/Markdown-only on Vercel or move to an external worker.

## Intentionally Not Migrated

- MCP autostart and MCP client tool execution.
- Terminal operation tool.
- Persistent local filesystem artifact storage.

## Explicit Non-Goals For Phase 1

- No frontend UI redesign.
- No Java code deletion.
- No MCP autostart on Vercel.
- No local filesystem persistence.
- No full parity with Spring AI orchestration yet.
