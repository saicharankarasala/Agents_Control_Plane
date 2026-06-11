"""Run listing + detail (dashboard, Clerk auth)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import clerk_auth
from app.models import Agent, Organization, Run, Span

router = APIRouter(prefix="/v1", tags=["runs"])


def _run_summary(run: Run, agent_name: str | None) -> dict:
    return {
        "id": run.id,
        "agent": agent_name,
        "status": run.status,
        "user_input": run.user_input,
        "final_output": run.final_output,
        "model": run.model,
        "total_latency_ms": run.total_latency_ms,
        "total_tokens": run.total_tokens,
        "total_cost_usd": float(run.total_cost_usd or 0),
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }


@router.get("/runs")
async def list_runs(
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    agent_id: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> dict:
    q = select(Run, Agent.name).join(Agent, Run.agent_id == Agent.id, isouter=True).where(
        Run.org_id == org.id
    )
    if status:
        q = q.where(Run.status == status)
    if agent_id:
        q = q.where(Run.agent_id == agent_id)
    q = q.order_by(Run.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(q)).all()
    return {"items": [_run_summary(r, name) for r, name in rows], "limit": limit, "offset": offset}


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    run = await db.get(Run, run_id)
    if run is None or run.org_id != org.id:
        raise HTTPException(404, "Run not found")
    agent = await db.get(Agent, run.agent_id) if run.agent_id else None
    spans = (
        await db.execute(select(Span).where(Span.run_id == run_id).order_by(Span.sequence))
    ).scalars().all()
    # compute offsets for the waterfall
    base = min((s.started_at for s in spans if s.started_at), default=None)
    span_out = []
    for s in spans:
        offset = int((s.started_at - base).total_seconds() * 1000) if (base and s.started_at) else 0
        span_out.append(
            {
                "id": s.id, "type": s.type, "name": s.name, "status": s.status,
                "tool_name": s.tool_name, "tool_input": s.tool_input, "tool_output": s.tool_output,
                "input": s.input, "output": s.output, "error": s.error,
                "latency_ms": s.latency_ms, "tokens": s.tokens, "cost_usd": float(s.cost_usd or 0),
                "sequence": s.sequence, "offset_ms": offset,
            }
        )
    return {**_run_summary(run, agent.name if agent else None), "spans": span_out}
