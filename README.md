# Agent Control Plane

**Testing, Observability & Governance for Enterprise AI Agents.**

Mission control for AI agents: track every run, view step-by-step traces, monitor
tool calls, run evaluations, enforce governance policies, gate risky actions behind
human approval, and generate compliance audit logs — for agents built with
LangChain, LlamaIndex, custom Python, or any LLM API.

> Portfolio-grade reference implementation in the class of LangSmith / Langfuse,
> built end-to-end: Python SDK → FastAPI ingestion → Postgres/Redis/Qdrant →
> Next.js dashboard.

**🔗 Live demo: https://agents-control-plane.venkatasaicharan.com** — open, no login (runs in `DEMO_MODE`).
Frontend on Vercel · backend (Docker + Traefik HTTPS) on a self-managed VPS.

---

## What's here

| Component | Path | Status |
|---|---|---|
| **Python SDK** (`agent-control-plane`) | `packages/sdk-python` | ✅ working + tested |
| **FastAPI backend** (ingest, evals, governance, approvals, audit) | `apps/api` | ✅ working + tested |
| **Next.js dashboard** | `apps/web` | ✅ live |
| **Docker Compose** (local + prod-with-Traefik) | `docker-compose*.yml` | ✅ |
| **Demo seed data** (banking refund-agent persona) | `seeds/` | ✅ |

## Quickstart (zero infra — SQLite)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e packages/sdk-python
pip install "fastapi" "uvicorn[standard]" "pydantic-settings" "sqlalchemy[asyncio]" aiosqlite jsonschema httpx

# 1. run the API (SQLite fallback, no Postgres needed)
cd apps/api && ENV=development uvicorn app.main:app --reload --port 8000 &

# 2. send a traced run through the SDK
python examples/custom_agent.py

# 3. seed rich demo data
python seeds/generate_demo_data.py --n 120

# 4. inspect
curl localhost:8000/v1/overview
curl localhost:8000/v1/runs
curl "localhost:8000/v1/approvals?status=pending"
```

## Full stack (Docker)

```bash
cp .env.example .env      # add ANTHROPIC_API_KEY for the LLM-judge
make up                   # postgres + redis + qdrant + api + worker
make web                  # next.js dashboard on :3000
```

## SDK in 6 lines

```python
import acp
acp.init(api_key="acp_...", project="support")

with acp.run(agent="refund-agent", user_input=q) as run:
    with run.span("llm", model="claude-sonnet-4-6") as s:
        s.set_output(resp); s.set_tokens(input=120, output=80)
    with run.tool("issue_refund", args={"amount": 500}) as t:
        run.require_approval(t)       # blocks until a human approves
        t.set_tool_output(do_refund())
    run.set_output(answer)
```

High-risk tools (`issue_refund`, `send_email`, …) and PII are detected
automatically and surfaced in the **approval queue** and **policy violation
center**. Every governance event writes an **audit log** entry.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md). TL;DR: one Python codebase across SDK,
API, and workers; OpenTelemetry-compatible event schema; Postgres for metadata,
Redis for live state + the async job queue, Qdrant for trace similarity.

## Tests

```bash
cd apps/api && pytest -q              # 3 passed — ingest, idempotency, governance
cd packages/sdk-python && pytest -q   # 4 passed — capture, decorator, pricing, fail-open
```

## License

MIT (SDK). See `packages/sdk-python`.
