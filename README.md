# NEXUS

AI research platform: one query fans out to multiple providers in parallel,
results are normalized, deduplicated, scored and ranked, and an AI answer is
streamed back with numbered citations linked to sources.

## Quick start (no Docker)

Backend:

    cd backend
    python -m venv .venv && .venv/bin/pip install -r requirements.txt
    .venv/bin/uvicorn app.main:app --reload        # http://localhost:8000/docs

Frontend:

    cd frontend
    npm install
    npm run dev                                    # http://localhost:3000

SQLite and in-memory cache/rate-limiting are used automatically — no
services required. Set `NEXUS_ANTHROPIC_API_KEY` for synthesized answers;
without it NEXUS falls back to an extractive, still-cited answer.

## Quick start (Docker)

    cp .env.example .env    # edit values
    docker compose up --build   # http://localhost:8080

Runs PostgreSQL, Redis, the API, the frontend, and Nginx (with SSE
buffering disabled on /api/).

## Architecture

    frontend (Next.js) ── /api/v1 ──> FastAPI
                                        ├─ auth: JWT access + refresh with rotation & revocation (Redis jti denylist), bcrypt, RBAC guard, logout
                                        ├─ search orchestrator ── parallel, per-provider
                                        │     timeouts, failure isolation
                                        │     └─ providers (plugins): wikipedia, hackernews,
                                        │        arxiv, github — register via decorator
                                        ├─ pipeline: normalize → dedup → score → rank
                                        ├─ ai: provider-agnostic LLM (Anthropic/OpenAI)
                                        │      streaming answers with [n] citations,
                                        │      extractive fallback with no key
                                        ├─ cache + rate limit: Redis, in-memory fallback
                                        └─ PostgreSQL (SQLite in dev)

### Adding a provider

Create `backend/app/providers/yourprovider.py`:

    @register_provider
    class YourProvider(SearchProvider):
        name = "yourprovider"
        description = "..."
        async def search(self, query, client, limit): ...

Import it in `app/providers/__init__.py`. Nothing else changes — the
orchestrator, API, and UI pick it up automatically.

## Tests

    cd backend && .venv/bin/python -m pytest tests

Covers the result pipeline (normalization, dedup, scoring, ranking),
orchestrator guarantees (parallelism, per-provider timeout and failure
isolation), and the full auth + bookmarks API flow.

## Honest status

Implemented and tested: provider plugin system (6 providers: wikipedia,
hackernews, arxiv, github, stackoverflow, openlibrary), parallel
orchestrator with failure/timeout isolation, result pipeline, SSE
streaming search with cited answers, multi-turn research chat with
preserved context and persisted citations, conversation sharing via
public links, notebook, bookmark annotations, markdown export
(sources/notes/conversations), follow-up question suggestions (needs an
LLM key), JWT auth with rotating/revocable refresh tokens + RBAC, rate limiting, caching,
bookmarks/collections/workspaces API + UIs, admin metrics dashboard,
health checks, structured logging, Docker/Nginx infra, dark UI with
command palette and interactive citations.

Optional (works only with a key): synthesized LLM answers and follow-ups
(Anthropic or OpenAI key); semantic embedding rerank (OpenAI key —
Anthropic has no embeddings API). Without keys, search still works with
the lexical ranker and extractive cited answers.

Not built: e2e/accessibility test suites, PDF export (markdown only),
provider enable/disable admin UI, analytics charts. Deployment (domain,
HTTPS, keys) is on you.
