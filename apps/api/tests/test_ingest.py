"""Ingest + governance regression tests, including snapshot idempotency."""
import os

import pytest
from httpx import ASGITransport, AsyncClient

os.environ["ENV"] = "development"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_acp.db"


@pytest.fixture
async def client():
    # fresh schema per test (drop + create) — avoids cross-test state
    from app.db import Base, engine, init_models
    from app.main import app

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await init_models()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        yield c


def _batch(status="completed", tool=None):
    spans = [{"type": "llm", "name": "reason", "sequence": 1, "tokens": 100,
              "started_at": "2026-01-01T00:00:00Z"}]
    if tool:
        spans.append({"type": "tool", "name": tool, "tool_name": tool, "sequence": 2,
                      "tool_input": {"amount": 500}, "started_at": "2026-01-01T00:00:01Z"})
    return {"run": {"external_run_id": "run-1", "agent": "a", "status": status,
                    "user_input": "hi", "final_output": "ok"}, "spans": spans}


async def test_basic_ingest(client):
    r = await client.post("/v1/traces", json=_batch())
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    runs = (await client.get("/v1/runs")).json()["items"]
    assert len(runs) == 1


async def test_snapshot_is_idempotent(client):
    # same external_run_id sent twice (as the SDK does on flush + exit)
    await client.post("/v1/traces", json=_batch(tool="issue_refund"))
    await client.post("/v1/traces", json=_batch(tool="issue_refund"))
    runs = (await client.get("/v1/runs")).json()["items"]
    assert len(runs) == 1  # one run, not two
    detail = (await client.get(f"/v1/runs/{runs[0]['id']}")).json()
    assert len(detail["spans"]) == 2  # spans replaced, not duplicated
    approvals = (await client.get("/v1/approvals?status=pending")).json()["items"]
    assert len(approvals) == 1  # one approval, not two


async def test_high_risk_opens_approval(client):
    await client.post("/v1/traces", json=_batch(tool="issue_refund"))
    runs = (await client.get("/v1/runs")).json()["items"]
    assert runs[0]["status"] == "awaiting_approval"
    violations = (await client.get("/v1/policy-violations")).json()["items"]
    assert any(v["details"].get("tool") == "issue_refund" for v in violations)
