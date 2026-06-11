"""Ingest service: persist a trace batch, run sync policies, open approvals."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Agent, Approval, AuditLog, Policy, PolicyViolation, Run, Span
from app.schemas import TraceBatch
from app.services.policies import run_sync_policies


async def _get_or_create_agent(db: AsyncSession, org_id: str, name: str, framework: str) -> Agent:
    agent = (
        await db.execute(select(Agent).where(Agent.org_id == org_id, Agent.name == name))
    ).scalar_one_or_none()
    if agent is None:
        agent = Agent(org_id=org_id, name=name, framework=framework)
        db.add(agent)
        await db.flush()
    return agent


async def ingest_batch(db: AsyncSession, org_id: str, batch: TraceBatch) -> Run:
    agent = await _get_or_create_agent(db, org_id, batch.run.agent, batch.run.framework)

    run: Run | None = None
    if batch.run.external_run_id:
        run = (
            await db.execute(
                select(Run).where(
                    Run.org_id == org_id, Run.external_run_id == batch.run.external_run_id
                )
            )
        ).scalar_one_or_none()

    if run is None:
        run = Run(org_id=org_id, agent_id=agent.id, external_run_id=batch.run.external_run_id)
        db.add(run)

    run.status = batch.run.status
    run.user_input = batch.run.user_input
    run.final_output = batch.run.final_output
    run.model = batch.run.model
    run.extra = batch.run.metadata
    run.total_latency_ms = batch.run.total_latency_ms
    run.total_tokens = batch.run.total_tokens
    run.total_cost_usd = batch.run.total_cost_usd
    run.started_at = batch.run.started_at
    run.ended_at = batch.run.ended_at
    await db.flush()

    # The SDK sends a full snapshot on each flush, so re-ingest must be
    # idempotent: replace this run's spans and clear its open violations
    # rather than appending duplicates.
    await db.execute(delete(Span).where(Span.run_id == run.id))
    await db.execute(
        delete(PolicyViolation).where(
            PolicyViolation.run_id == run.id, PolicyViolation.status == "open"
        )
    )

    span_dicts = []
    for sp in batch.spans:
        span = Span(
            run_id=run.id, org_id=org_id, parent_span_id=sp.parent_span_id,
            type=sp.type, name=sp.name, status=sp.status,
            input=sp.input, output=sp.output,
            tool_name=sp.tool_name, tool_input=sp.tool_input, tool_output=sp.tool_output,
            latency_ms=sp.latency_ms, tokens=sp.tokens, cost_usd=sp.cost_usd,
            error=sp.error, sequence=sp.sequence,
            started_at=sp.started_at, ended_at=sp.ended_at,
        )
        db.add(span)
        await db.flush()
        span_dicts.append({**sp.model_dump(), "id": span.id})

    # --- synchronous governance pass ---
    run_dict = batch.run.model_dump()
    violations = run_sync_policies(run_dict, span_dicts)
    requires_approval = False
    for v in violations:
        policy = await _get_or_create_policy(db, org_id, v.type, v.severity, v.action)
        db.add(
            PolicyViolation(
                policy_id=policy.id, run_id=run.id, span_id=v.span_id, org_id=org_id,
                severity=v.severity, details=v.details, status="open",
            )
        )
        db.add(
            AuditLog(
                org_id=org_id, actor_type="system", action="policy_violation",
                resource_type="run", resource_id=run.id, after={"type": v.type, **v.details},
            )
        )
        if v.action == "require_approval":
            existing = (
                await db.execute(
                    select(Approval).where(
                        Approval.run_id == run.id,
                        Approval.action_type == v.details.get("tool", "unknown"),
                    )
                )
            ).scalar_one_or_none()
            if existing is None:
                db.add(
                    Approval(
                        run_id=run.id, span_id=v.span_id, org_id=org_id,
                        action_type=v.details.get("tool", "unknown"),
                        action_payload=v.details.get("args") or {},
                        risk_reason=f"High-risk tool: {v.details.get('tool')}",
                        status="pending",
                    )
                )
                requires_approval = True
            elif existing.status == "pending":
                requires_approval = True

    if requires_approval:
        run.status = "awaiting_approval"

    await db.commit()
    await db.refresh(run)
    return run


async def _get_or_create_policy(db: AsyncSession, org_id, type_, severity, action) -> Policy:
    policy = (
        await db.execute(select(Policy).where(Policy.org_id == org_id, Policy.type == type_))
    ).scalar_one_or_none()
    if policy is None:
        policy = Policy(
            org_id=org_id, name=type_.replace("_", " ").title(), type=type_,
            severity=severity, action=action, enabled=True,
        )
        db.add(policy)
        await db.flush()
    return policy
