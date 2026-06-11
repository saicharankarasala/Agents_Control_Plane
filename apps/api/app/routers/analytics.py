"""Server-side aggregates for the dashboard — authoritative totals + time series
computed across ALL runs (not a client sample)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import clerk_auth
from app.models import Organization, Run

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

    # per-agent
    agent_rows = (
        await db.execute(
            select(
                Run.agent_id, func.count(Run.id),
                func.coalesce(func.sum(Run.total_cost_usd), 0),
                func.coalesce(func.avg(Run.total_latency_ms), 0),
            ).where(*scope).group_by(Run.agent_id)
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
            {"agent_id": a, "runs": n, "cost": round(float(c), 4), "avg_latency": int(lat)}
            for a, n, c, lat in agent_rows
        ],
    }
