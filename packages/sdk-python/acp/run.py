"""Run and Span capture — the core tracing primitives."""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from acp.exceptions import ApprovalRejected, ApprovalTimeout
from acp.pricing import estimate_cost


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Span:
    def __init__(self, run: "Run", type: str, name: str, **attrs: Any):
        self.run = run
        self.id = str(uuid.uuid4())
        self.type = type
        self.name = name
        self.attrs = attrs
        self.model: str | None = attrs.get("model")
        self.status = "ok"
        self.input: dict | None = attrs.get("input")
        self.output: dict | None = None
        self.tool_name: str | None = attrs.get("tool_name")
        self.tool_input: dict | None = attrs.get("args")
        self.tool_output: dict | None = None
        self.tokens = 0
        self.cost_usd = 0.0
        self.error: str | None = None
        self.sequence = run._next_seq()
        self.started_at = _now()
        self.ended_at: datetime | None = None
        self._start = time.perf_counter()

    def __enter__(self) -> "Span":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        self.latency_ms = int((time.perf_counter() - self._start) * 1000)
        self.ended_at = _now()
        if exc is not None:
            self.status = "error"
            self.error = repr(exc)
        self.run._emit(self)
        return False  # never swallow the host's exception

    def set_output(self, output: Any) -> None:
        self.output = output if isinstance(output, dict) else {"value": str(output)}

    def set_tool_output(self, output: Any) -> None:
        self.tool_output = output if isinstance(output, dict) else {"value": str(output)}

    def set_tokens(self, input: int = 0, output: int = 0) -> None:
        self.tokens = input + output
        self.cost_usd = estimate_cost(self.model, input, output)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "parent_span_id": None, "type": self.type, "name": self.name,
            "status": self.status, "input": self.input, "output": self.output,
            "tool_name": self.tool_name, "tool_input": self.tool_input,
            "tool_output": self.tool_output, "latency_ms": getattr(self, "latency_ms", 0),
            "tokens": self.tokens, "cost_usd": self.cost_usd, "error": self.error,
            "sequence": self.sequence,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
        }


class Run:
    def __init__(self, client, agent: str, user_input: str | None = None, **meta: Any):
        from acp import _config

        self._client = client
        self.agent = agent
        self.framework = meta.pop("framework", "custom")
        self.project = meta.pop("project", _config.get("project"))
        self.external_run_id = meta.pop("external_run_id", str(uuid.uuid4()))
        self.user_input = user_input
        self.final_output: str | None = None
        self.model: str | None = meta.pop("model", None)
        self.metadata = meta
        self.status = "running"
        self._spans: list[Span] = []
        self._seq = 0
        self.started_at = _now()

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def _emit(self, span: Span) -> None:
        self._spans.append(span)

    def span(self, type: str, name: str | None = None, **attrs: Any) -> Span:
        return Span(self, type, name or type, **attrs)

    def tool(self, tool_name: str, args: dict | None = None) -> Span:
        return Span(self, "tool", tool_name, tool_name=tool_name, args=args or {})

    def set_output(self, output: Any) -> None:
        self.final_output = str(output)

    def require_approval(self, span: Span, timeout: float = 300) -> None:
        """Pause until a human approves the action behind `span`.

        Sends the current trace (so the action appears in the queue), then polls.
        Raises ApprovalRejected / ApprovalTimeout accordingly.
        """
        self.status = "awaiting_approval"
        result = self._flush(final=False)
        approval_id = (result or {}).get("approval_id")
        if not approval_id:
            # Backend opens the approval from the high-risk policy; without an id
            # we cannot poll — fail open in dev.
            self.status = "running"
            return
        decision = self._client.wait_for_approval(approval_id, timeout=timeout)
        status = decision.get("status")
        if status == "approved":
            self.status = "running"
        elif status == "rejected":
            self.status = "rejected"
            raise ApprovalRejected(decision.get("reason") or "Action rejected by reviewer")
        else:
            raise ApprovalTimeout(f"Approval {approval_id} not resolved in time")

    def _payload(self) -> dict:
        latency = int((_now() - self.started_at).total_seconds() * 1000)
        return {
            "run": {
                "external_run_id": self.external_run_id, "agent": self.agent,
                "framework": self.framework, "project": self.project, "status": self.status,
                "user_input": self.user_input, "final_output": self.final_output,
                "model": self.model, "metadata": self.metadata,
                "total_latency_ms": latency,
                "total_tokens": sum(s.tokens for s in self._spans),
                "total_cost_usd": round(sum(s.cost_usd for s in self._spans), 6),
                "started_at": self.started_at.isoformat(),
                "ended_at": _now().isoformat() if self.status != "running" else None,
            },
            "spans": [s.to_dict() for s in self._spans],
        }

    def _flush(self, final: bool = True) -> dict | None:
        return self._client.send_trace(self._payload())

    def __enter__(self) -> "Run":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        if exc is not None and self.status == "running":
            self.status = "failed"
        elif self.status == "running":
            self.status = "completed"
        self._flush(final=True)
        return False
