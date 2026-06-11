"""Agent Control Plane API — FastAPI entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_models
from app.routers import analytics, approvals, governance, overview, runs, traces


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the schema exists on startup. create_all is idempotent (it only
    # creates missing tables, never drops), so this is safe to run on every
    # boot — dev SQLite and the VPS Postgres alike. Teams wanting versioned
    # migrations can disable this and use `alembic upgrade head` instead.
    await init_models()
    yield


app = FastAPI(title="Agent Control Plane API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (traces.router, runs.router, overview.router, approvals.router, governance.router, analytics.router):
    app.include_router(r)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "env": settings.env}
