"""Ingest endpoints (API-key auth) used by the SDK."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import api_key_auth
from app.models import Organization
from app.schemas import IngestResponse, TraceBatch
from app.services.ingest import ingest_batch

router = APIRouter(prefix="/v1", tags=["ingest"])


@router.post("/traces", response_model=IngestResponse)
async def ingest(
    batch: TraceBatch,
    org: Organization = Depends(api_key_auth),
    db: AsyncSession = Depends(get_db),
) -> IngestResponse:
    run = await ingest_batch(db, org.id, batch)
    # In docker: enqueue async eval/govern/embed jobs here (arq). Best-effort.
    try:
        from app.workers.queue import enqueue

        await enqueue("evaluate_and_govern", run.id, org.id)
    except Exception:
        pass
    return IngestResponse(run_id=run.id, status=run.status)
