"""Human-in-the-loop approval queue.

  * SDK polls GET /v1/approvals/{id} (api-key auth) while blocked.
  * Dashboard lists pending and approves/rejects (clerk auth).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import api_key_auth, clerk_auth
from app.models import Approval, AuditLog, Organization, Run
from app.schemas import ApprovalStatus

router = APIRouter(prefix="/v1", tags=["approvals"])


@router.get("/approvals/{approval_id}", response_model=ApprovalStatus)
async def get_approval(
    approval_id: str,
    org: Organization = Depends(api_key_auth),
    db: AsyncSession = Depends(get_db),
) -> ApprovalStatus:
    a = await db.get(Approval, approval_id)
    if a is None or a.org_id != org.id:
        raise HTTPException(404, "Approval not found")
    return ApprovalStatus(id=a.id, status=a.status, reason=a.reason)


@router.get("/approvals")
async def list_approvals(
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
    status: str = "pending",
) -> dict:
    rows = (
        await db.execute(
            select(Approval)
            .where(Approval.org_id == org.id, Approval.status == status)
            .order_by(Approval.requested_at.desc())
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": a.id, "run_id": a.run_id, "action_type": a.action_type,
                "action_payload": a.action_payload, "risk_reason": a.risk_reason,
                "status": a.status,
                "requested_at": a.requested_at.isoformat() if a.requested_at else None,
            }
            for a in rows
        ]
    }


async def _resolve(db, org, approval_id, new_status, reason) -> Approval:
    a = await db.get(Approval, approval_id)
    if a is None or a.org_id != org.id:
        raise HTTPException(404, "Approval not found")
    if a.status != "pending":
        raise HTTPException(409, f"Already {a.status}")
    a.status = new_status
    a.reason = reason
    a.resolved_at = datetime.now(timezone.utc)
    run = await db.get(Run, a.run_id)
    if run:
        run.status = "running" if new_status == "approved" else "rejected"
    db.add(
        AuditLog(
            org_id=org.id, actor_type="user", action=f"approval_{new_status}",
            resource_type="approval", resource_id=a.id, after={"reason": reason},
        )
    )
    await db.commit()
    return a


@router.post("/approvals/{approval_id}/approve")
async def approve(
    approval_id: str,
    reason: str | None = Body(default=None, embed=True),
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    a = await _resolve(db, org, approval_id, "approved", reason)
    return {"id": a.id, "status": a.status}


@router.post("/approvals/{approval_id}/reject")
async def reject(
    approval_id: str,
    reason: str | None = Body(default=None, embed=True),
    org: Organization = Depends(clerk_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    a = await _resolve(db, org, approval_id, "rejected", reason)
    return {"id": a.id, "status": a.status}
