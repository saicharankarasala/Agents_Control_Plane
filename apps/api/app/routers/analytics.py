"""Server-side aggregates for the dashboard — authoritative totals + time series
computed across ALL runs (not a client sample)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import clerk_auth
from app.models import Agent, Organization, Run

router = APIRouter(prefix="/v1", tags=["analytics"])


@router.get("/analytics")
async def analytics(
    days: int = 14,
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    scope = (Run.org_id == org.id,)

    # totals
    totals_row = (
        await db.execute(
            select(
                func.count(Run.id),
                func.coalesce(func.sum(Run.total_cost_usd), 0),
                func.coalesce(func.sum(Run.total_tokens), 0),
                func.coalesce(func.avg(Run.total_latency_ms), 0),
            ).where(*scope)
        )
    ).one()
    total_runs = totals_row[0] or 0
    total_cost = float(totals_row[1] or 0)
    total_tokens = int(totals_row[2] or 0)
    avg_latency = int(totals_row[3] or 0)
    failed = (
        await db.execute(select(func.count(Run.id)).where(*scope, Run.status == "failed"))
    ).scalar() or 0

    # daily buckets
    day = func.date(Run.created_at)
    daily_rows = (
        await db.execute(
            select(
                day.label("d"),
                func.count(Run.id),
                func.coalesce(func.sum(Run.total_cost_usd), 0),
                func.coalesce(func.avg(Run.total_latency_ms), 0),
                func.coalesce(func.sum(Run.total_tokens), 0),
            )
            .where(*scope, Run.created_at >= since)
            .group_by(day)
            .order_by(day)
        )
    ).all()
    daily = [
        {"date": str(d), "runs": n, "cost": round(float(c), 4),
         "avg_latency": int(lat), "tokens": int(tok)}
        for d, n, c, lat, tok in daily_rows
    ]

    # per-agent (joined to agent name, with success/fail breakdown)
    agent_rows = (
        await db.execute(
            select(
                Agent.name, Run.agent_id, func.count(Run.id),
                func.coalesce(func.sum(Run.total_cost_usd), 0),
                func.coalesce(func.avg(Run.total_latency_ms), 0),
                func.sum(case((Run.status == "failed", 1), else_=0)),
                func.sum(case((Run.status == "completed", 1), else_=0)),
                func.coalesce(func.sum(Run.total_tokens), 0),
            )
            .join(Agent, Run.agent_id == Agent.id, isouter=True)
            .where(*scope)
            .group_by(Run.agent_id, Agent.name)
        )
    ).all()

    # per-agent x day (for the latency heatmap)
    agent_day_rows = (
        await db.execute(
            select(
                Agent.name, func.date(Run.created_at), func.count(Run.id),
                func.coalesce(func.avg(Run.total_latency_ms), 0),
                func.sum(case((Run.status == "failed", 1), else_=0)),
            )
            .join(Agent, Run.agent_id == Agent.id, isouter=True)
            .where(*scope, Run.created_at >= since)
            .group_by(Agent.name, func.date(Run.created_at))
        )
    ).all()

    # by status
    status_rows = (
        await db.execute(
            select(Run.status, func.count(Run.id)).where(*scope).group_by(Run.status)
        )
    ).all()

    # by model
    model_rows = (
        await db.execute(
            select(Run.model, func.count(Run.id)).where(*scope).group_by(Run.model)
        )
    ).all()

    return {
        "totals": {
            "runs": total_runs, "cost": round(total_cost, 4), "tokens": total_tokens,
            "avg_latency": avg_latency, "failed": failed,
            "error_rate": round(failed / total_runs, 4) if total_runs else 0,
        },
        "daily": daily,
        "by_status": [{"status": s, "count": n} for s, n in status_rows],
        "by_model": [{"model": m or "unknown", "count": n} for m, n in model_rows],
        "by_agent": [
            {
                "agent": name or "unknown", "agent_id": aid, "runs": n,
                "cost": round(float(c), 4), "avg_latency": int(lat),
                "failed": int(fail or 0), "completed": int(done or 0), "tokens": int(tok or 0),
            }
            for name, aid, n, c, lat, fail, done, tok in agent_rows
        ],
        "by_agent_daily": [
            {"agent": name or "unknown", "date": str(d), "runs": n,
             "avg_latency": int(lat), "failed": int(fail or 0)}
            for name, d, n, lat, fail in agent_day_rows
        ],
    }
