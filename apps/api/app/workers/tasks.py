"""Async workers (arq): run evaluations, async policy checks, and embeddings.

Run with:  arq app.workers.tasks.WorkerSettings
"""
from __future__ import annotations

from arq.connections import RedisSettings

from app.config import settings


async def evaluate_and_govern(ctx, run_id: str, org_id: str) -> None:
    """Post-run async pass: LLM-judge evals, Claude policy checks, embed summary."""
    from sqlalchemy import select

    from app.db import SessionLocal
    from app.models import Evaluation, EvalResult, Run, Span
    from app.services.evals import run_evaluator

    async with SessionLocal() as db:
        run = await db.get(Run, run_id)
        if run is None:
            return
        spans = (
            await db.execute(select(Span).where(Span.run_id == run_id).order_by(Span.sequence))
        ).scalars().all()
        run_dict = {
            "user_input": run.user_input, "final_output": run.final_output,
            "model": run.model, "metadata": run.extra,
        }
        span_dicts = [{"tool_name": s.tool_name, "type": s.type} for s in spans]

        evals = (
            await db.execute(select(Evaluation).where(Evaluation.org_id == org_id))
        ).scalars().all()
        for ev in evals:
            if ev.type == "llm_judge":
                res = await _llm_judge(run_dict, ev.config)
            else:
                r = run_evaluator(ev.type, run_dict, span_dicts, ev.config)
                res = {"passed": r.passed, "score": r.score, "details": r.details}
            db.add(
                EvalResult(
                    evaluation_id=ev.id, run_id=run_id, org_id=org_id,
                    passed=res["passed"], score=res.get("score"), details=res.get("details", {}),
                )
            )
        await db.commit()

    await _embed_trace(run_id, org_id)


async def _llm_judge(run_dict: dict, config: dict) -> dict:
    """Claude-as-judge. Falls back to a skipped result if no API key."""
    if not settings.anthropic_api_key:
        return {"passed": True, "score": None, "details": {"skipped": "no ANTHROPIC_API_KEY"}}
    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        rubric = config.get("rubric", "Is the answer correct, helpful, and grounded?")
        prompt = (
            f"You are an evaluation judge. Rubric: {rubric}\n\n"
            f"User input: {run_dict.get('user_input')}\n"
            f"Agent output: {run_dict.get('final_output')}\n\n"
            "Respond ONLY as JSON: {\"passed\": bool, \"score\": 0-1, \"reasoning\": str}"
        )
        msg = await client.messages.create(
            model=settings.judge_model, max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        import json

        text = msg.content[0].text  # type: ignore[union-attr]
        data = json.loads(text[text.find("{") : text.rfind("}") + 1])
        return {"passed": bool(data.get("passed")), "score": data.get("score"),
                "details": {"reasoning": data.get("reasoning")}}
    except Exception as e:  # pragma: no cover
        return {"passed": False, "score": None, "details": {"error": str(e)}}


async def _embed_trace(run_id: str, org_id: str) -> None:
    """Embed a run summary into Qdrant for similarity search. Best-effort."""
    try:
        from fastembed import TextEmbedding
        from qdrant_client import AsyncQdrantClient
        from qdrant_client.models import Distance, PointStruct, VectorParams

        from app.db import SessionLocal
        from app.models import Run

        async with SessionLocal() as db:
            run = await db.get(Run, run_id)
            if run is None:
                return
            summary = f"{run.user_input or ''} -> {run.final_output or ''}"

        model = TextEmbedding(model_name=settings.embed_model)
        vector = list(model.embed([summary]))[0].tolist()

        client = AsyncQdrantClient(url=settings.qdrant_url)
        try:
            await client.get_collection("trace_summaries")
        except Exception:
            await client.create_collection(
                "trace_summaries",
                vectors_config=VectorParams(size=len(vector), distance=Distance.COSINE),
            )
        await client.upsert(
            "trace_summaries",
            points=[PointStruct(id=run_id, vector=vector,
                                payload={"run_id": run_id, "org_id": org_id, "summary": summary})],
        )
    except Exception:
        pass  # similarity is a nice-to-have; never block the pipeline


class WorkerSettings:
    functions = [evaluate_and_govern]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
