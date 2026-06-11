"""Overview metrics for the dashboard home."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import clerk_auth
from app.models import Organization, PolicyViolation, Run

router = APIRouter(prefix="/v1", tags=["overview"])


@router.get("/overview")
async def overview(
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    base = select(Run).where(Run.org_id == org.id, Run.created_at >= since)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    failed = (
        await db.execute(
            select(func.count()).select_from(base.where(Run.status == "failed").subquery())
        )
    ).scalar() or 0
    cost = (
        await db.execute(
            select(func.coalesce(func.sum(Run.total_cost_usd), 0)).where(
                Run.org_id == org.id, Run.created_at >= since
            )
        )
    ).scalar() or 0
    avg_latency = (
        await db.execute(
            select(func.coalesce(func.avg(Run.total_latency_ms), 0)).where(
                Run.org_id == org.id, Run.created_at >= since
            )
        )
    ).scalar() or 0
    open_violations = (
        await db.execute(
            select(func.count()).select_from(
                select(PolicyViolation)
                .where(PolicyViolation.org_id == org.id, PolicyViolation.status == "open")
                .subquery()
            )
        )
    ).scalar() or 0
    awaiting = (
        await db.execute(
            select(func.count()).select_from(
                base.where(Run.status == "awaiting_approval").subquery()
            )
        )
    ).scalar() or 0

    return {
        "total_runs": total,
        "error_rate": round(failed / total, 4) if total else 0,
        "total_cost_usd": round(float(cost), 4),
        "avg_latency_ms": int(avg_latency),
        "open_violations": open_violations,
        "awaiting_approval": awaiting,
    }
