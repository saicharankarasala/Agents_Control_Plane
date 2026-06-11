# Architecture

## Overview

```
  Customer Agent (LangChain / custom)
        │  acp SDK  — fails open, batches spans
        ▼  HTTPS POST /v1/traces (API-key auth)
  ┌────────────────────────────────────────────────┐
  │ FastAPI (apps/api)                               │
  │  routers: traces · runs · overview · approvals   │
  │           governance(evals/policies/audit)       │
  │  services: ingest · policies · evals             │
  └───┬─────────────┬──────────────┬─────────────────┘
      │ Postgres     │ Redis         │ Qdrant
      │ metadata     │ live state    │ trace similarity
      │ + audit      │ + arq queue   │ (fastembed)
      ▼              ▼               ▼
  ┌────────────────────────────────────────────────┐
  │ Workers (arq) — apps/api/app/workers/tasks.py    │
  │  evaluate_and_govern: LLM-judge (Claude Haiku),  │
  │  async policy checks, embed trace summary        │
  └────────────────────────────────────────────────┘
                     │
                     ▼  Anthropic API (judge + policy RAG)
  ┌────────────────────────────────────────────────┐
  │ Next.js dashboard (apps/web) — Clerk auth         │
  │  overview · runs · trace waterfall · evals ·      │
  │  policies · approvals · audit · settings          │
  └────────────────────────────────────────────────┘
```

## Key design decisions

- **One language end-to-end (Python).** SDK, API, evaluators, policy engine, and
  the LLM-judge share pydantic models — zero serialization drift.
- **Snapshot ingest, idempotent.** The SDK sends a *full* run snapshot on each
  flush (notably during `require_approval`, so the action appears in the queue
  while the agent is blocked). The ingest service therefore upserts the run on
  `external_run_id`, **replaces** its spans, clears open violations, and dedupes
  approvals — re-ingest never duplicates. (`app/services/ingest.py`)
- **Fail open.** SDK network/HTTP errors are swallowed; observability never
  breaks the host agent. (`acp/client.py`)
- **Governance runs in two passes.** Cheap, deterministic checks (PII regex,
  high-risk tool, unsafe tool) run synchronously on ingest; expensive
  Claude-backed checks and LLM-judge evals run async in the worker.
- **OpenTelemetry-compatible spans.** `type`/`name`/attributes map cleanly to OTel,
  so traces can later export to any OTel backend without an SDK rewrite.
- **Human-in-the-loop via polling (MVP).** The SDK blocks and polls
  `GET /v1/approvals/{id}`. Production would swap to a webhook/callback or a
  Temporal signal for durable long pauses — isolated to `Run.require_approval`.
- **Multi-tenant by `org_id` on every row.** One auth rule: resolve org (API key
  or Clerk JWT) → filter every query. Dev falls back to a demo org so the stack
  runs with zero secrets.

## Data model

`organizations · users · api_keys · projects · agents · runs · spans ·
evaluations · eval_results · policies · policy_violations · approvals ·
audit_logs` — see `apps/api/app/models.py`. Portable across SQLite (dev) and
Postgres (prod): string-UUID PKs and the generic JSON type.

## Local vs production

| | Local (dev) | Production |
|---|---|---|
| DB | SQLite (auto-created) | Postgres (Alembic migrations) |
| Queue | skipped (sync ingest only) | Redis + arq workers |
| Vector | optional | Qdrant Cloud |
| Auth | demo-org fallback | Clerk JWT / API keys |
| Judge | skipped without key | Claude Haiku |

## What's deliberately deferred

Kafka/Redpanda, Temporal, wired-up Kubernetes/Helm, SOC2/HIPAA controls,
sandboxed custom-Python evaluators, SSO/SAML. See the build plan §12/§18 for the
MVP-vs-enterprise split and rationale.
