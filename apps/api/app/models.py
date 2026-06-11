"""SQLAlchemy ORM models — the canonical Agent Control Plane schema.

Portable across SQLite (dev) and PostgreSQL (prod): string UUID PKs and the
generic JSON type are used so the same models run on both. Every tenant-scoped
row carries org_id for isolation.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    clerk_org_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    plan: Mapped[str] = mapped_column(String, default="community")  # community|pro|team|enterprise
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    clerk_user_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    email: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="member")  # admin|member|approver|viewer
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ApiKey(Base):
    __tablename__ = "api_keys"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    key_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    prefix: Mapped[str] = mapped_column(String)  # shown in UI, e.g. "acp_live_abc1"
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Agent(Base):
    __tablename__ = "agents"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String)
    framework: Mapped[str] = mapped_column(String, default="custom")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    external_run_id: Mapped[str | None] = mapped_column(String, index=True)
    status: Mapped[str] = mapped_column(String, default="running")
    # running|completed|failed|awaiting_approval|rejected
    user_input: Mapped[str | None] = mapped_column(Text)
    final_output: Mapped[str | None] = mapped_column(Text)
    total_latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_usd: Mapped[float] = mapped_column(Numeric(12, 6), default=0)
    model: Mapped[str | None] = mapped_column(String)
    extra: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    spans: Mapped[list[Span]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="Span.sequence"
    )

    __table_args__ = (Index("ix_runs_org_created", "org_id", "created_at"),)


class Span(Base):
    __tablename__ = "spans"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    parent_span_id: Mapped[str | None] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # llm|tool|retrieval|chain|guardrail
    name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="ok")
    input: Mapped[dict | None] = mapped_column(JSON)
    output: Mapped[dict | None] = mapped_column(JSON)
    tool_name: Mapped[str | None] = mapped_column(String)
    tool_input: Mapped[dict | None] = mapped_column(JSON)
    tool_output: Mapped[dict | None] = mapped_column(JSON)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Numeric(12, 6), default=0)
    error: Mapped[str | None] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)

    run: Mapped[Run] = relationship(back_populates="spans")


class Evaluation(Base):
    __tablename__ = "evaluations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    # exact|json_schema|forbidden_tool|tool_sequence|citation|custom_python|llm_judge
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class EvalResult(Base):
    __tablename__ = "eval_results"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    evaluation_id: Mapped[str] = mapped_column(ForeignKey("evaluations.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    passed: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[float | None] = mapped_column(Float)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Policy(Base):
    __tablename__ = "policies"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # pii|unsafe_tool|hallucinated_arg|high_risk
    severity: Mapped[str] = mapped_column(String, default="medium")  # low|medium|high|critical
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    action: Mapped[str] = mapped_column(String, default="flag")  # log|flag|block|require_approval
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class PolicyViolation(Base):
    __tablename__ = "policy_violations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    span_id: Mapped[str | None] = mapped_column(String)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    severity: Mapped[str] = mapped_column(String, default="medium")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="open")  # open|acknowledged|resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    span_id: Mapped[str | None] = mapped_column(String)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    action_type: Mapped[str] = mapped_column(String)
    action_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    risk_reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|approved|rejected|expired
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    resolved_by: Mapped[str | None] = mapped_column(String)
    reason: Mapped[str | None] = mapped_column(Text)


class AuditLog(Base):
    __tablename__ = "audit_logs"  # append-only
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor_type: Mapped[str] = mapped_column(String)  # user|system|agent
    actor_id: Mapped[str | None] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str] = mapped_column(String)
    resource_id: Mapped[str | None] = mapped_column(String)
    before: Mapped[dict | None] = mapped_column(JSON)
    after: Mapped[dict | None] = mapped_column(JSON)
    ip: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)
