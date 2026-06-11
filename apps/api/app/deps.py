"""Auth dependencies.

Two entry paths share one rule: every request resolves to an org_id, and all
queries filter on it.

  * api_key_auth  — SDK ingest. Bearer 'acp_...' key, hashed and matched.
  * clerk_auth    — dashboard. Verifies a Clerk JWT (stubbed in dev to a demo org).

In development (no Clerk/key configured) both fall back to a demo org so the
stack is runnable end-to-end with zero secrets.
"""
from __future__ import annotations

import hashlib

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models import ApiKey, Organization

DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


async def _ensure_demo_org(db: AsyncSession) -> Organization:
    org = await db.get(Organization, DEMO_ORG_ID)
    if org is None:
        org = Organization(id=DEMO_ORG_ID, name="Demo Org", plan="team")
        db.add(org)
        await db.commit()
    return org


async def api_key_auth(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    if not authorization:
        if settings.env == "development":
            return await _ensure_demo_org(db)
        raise HTTPException(401, "Missing API key")

    raw = authorization.removeprefix("Bearer ").strip()
    row = (
        await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == hash_key(raw), ApiKey.revoked_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if row is None:
        if settings.env == "development":
            return await _ensure_demo_org(db)
        raise HTTPException(401, "Invalid API key")
    org = await db.get(Organization, row.org_id)
    if org is None:
        raise HTTPException(401, "Invalid API key")
    return org


async def clerk_auth(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    # Production: verify JWT against settings.clerk_jwt_issuer, read org claim.
    # Dev: fall back to the demo org so the dashboard works without Clerk.
    if settings.env == "development" or not settings.clerk_jwt_issuer:
        return await _ensure_demo_org(db)
    raise HTTPException(501, "Clerk JWT verification not configured")
