"""Pydantic wire schemas — the contract between the SDK and the ingest API.

These mirror the OpenTelemetry span model loosely (trace/span/attributes) so
events can later be exported to any OTel-compatible backend.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

SpanType = Literal["llm", "tool", "retrieval", "chain", "guardrail"]
RunStatus = Literal["running", "completed", "failed", "awaiting_approval", "rejected"]


class SpanIn(BaseModel):
    id: str | None = None
    parent_span_id: str | None = None
    type: SpanType
    name: str
    status: str = "ok"
    input: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    tool_output: dict[str, Any] | None = None
    latency_ms: int = 0
    tokens: int = 0
    cost_usd: float = 0.0
    error: str | None = None
    sequence: int = 0
    started_at: datetime | None = None
    ended_at: datetime | None = None


class RunIn(BaseModel):
    external_run_id: str | None = None
    agent: str = "default"
    framework: str = "custom"
    project: str | None = None
    status: RunStatus = "completed"
    user_input: str | None = None
    final_output: str | None = None
    model: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    total_latency_ms: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    started_at: datetime | None = None
    ended_at: datetime | None = None


class TraceBatch(BaseModel):
    """One run plus its spans, sent by the SDK in a single request."""

    run: RunIn
    spans: list[SpanIn] = Field(default_factory=list)


class IngestResponse(BaseModel):
    run_id: str
    status: RunStatus


class ApprovalRequest(BaseModel):
    run_external_id: str
    action_type: str
    action_payload: dict[str, Any] = Field(default_factory=dict)
    risk_reason: str | None = None


class ApprovalStatus(BaseModel):
    id: str
    status: Literal["pending", "approved", "rejected", "expired"]
    reason: str | None = None
