"""Thin wrapper over arq for enqueuing async jobs.

Best-effort: if Redis/arq is unavailable (e.g. local SQLite-only runs), the API
degrades gracefully — ingestion still works, async eval/embed jobs are skipped.
"""
from __future__ import annotations

from app.config import settings

_pool = None


async def _get_pool():
    global _pool
    if _pool is None:
        from arq import create_pool
        from arq.connections import RedisSettings

        _pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    return _pool


async def enqueue(task: str, *args) -> None:
    pool = await _get_pool()
    await pool.enqueue_job(task, *args)
