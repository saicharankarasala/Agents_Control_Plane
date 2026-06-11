"""Policy violations, evaluations, and audit log read endpoints (dashboard)."""
from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import clerk_auth
from app.models import AuditLog, EvalResult, Evaluation, Organization, PolicyViolation

router = APIRouter(prefix="/v1", tags=["governance"])


@router.get("/policy-violations")
async def list_violations(
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
) -> dict:
    q = select(PolicyViolation).where(PolicyViolation.org_id == org.id)
    if status:
        q = q.where(PolicyViolation.status == status)
    rows = (await db.execute(q.order_by(PolicyViolation.created_at.desc()))).scalars().all()
    return {
        "items": [
            {
                "id": v.id, "run_id": v.run_id, "policy_id": v.policy_id, "severity": v.severity,
                "details": v.details, "status": v.status,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in rows
        ]
    }


@router.patch("/policy-violations/{vid}")
async def update_violation(
    vid: str,
    status: str,
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    v = await db.get(PolicyViolation, vid)
    if v is None or v.org_id != org.id:
        raise HTTPException(404, "Not found")
    v.status = status
    await db.commit()
    return {"id": v.id, "status": v.status}


@router.get("/eval-results")
async def list_eval_results(
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
    run_id: str | None = None,
) -> dict:
    q = (
        select(EvalResult, Evaluation.name, Evaluation.type)
        .join(Evaluation, EvalResult.evaluation_id == Evaluation.id)
        .where(EvalResult.org_id == org.id)
    )
    if run_id:
        q = q.where(EvalResult.run_id == run_id)
    rows = (await db.execute(q.order_by(EvalResult.created_at.desc()))).all()
    return {
        "items": [
            {
                "id": r.id, "run_id": r.run_id, "name": name, "type": type_,
                "passed": r.passed, "score": r.score, "details": r.details,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r, name, type_ in rows
        ]
    }


@router.get("/audit-logs")
async def list_audit(
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
    export: str | None = None,
    limit: int = 200,
) -> object:
    rows = (
        await db.execute(
            select(AuditLog)
            .where(AuditLog.org_id == org.id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    items = [
        {
            "id": a.id, "actor_type": a.actor_type, "actor_id": a.actor_id, "action": a.action,
            "resource_type": a.resource_type, "resource_id": a.resource_id, "after": a.after,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in rows
    ]
    if export == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["id", "actor_type", "action", "resource_type", "resource_id", "created_at"])
        for a in items:
            w.writerow([a["id"], a["actor_type"], a["action"], a["resource_type"],
                        a["resource_id"], a["created_at"]])
        buf.seek(0)
        return StreamingResponse(
            buf, media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
        )
    return {"items": items}
