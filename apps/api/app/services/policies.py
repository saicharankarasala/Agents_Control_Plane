"""Governance / policy engine.

Rule-based checks that run synchronously on ingest (cheap, deterministic). Each
returns a list of Violation dicts. The Claude-backed checks live in
workers/tasks.py and run asynchronously.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

# --- PII detectors (regex-based; presidio is the prod upgrade) ---
PII_PATTERNS = {
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
    "email": re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"),
    "phone": re.compile(r"\b\+?\d{1,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b"),
}

HIGH_RISK_TOOLS = {"issue_refund", "send_email", "delete_record", "prod_api", "wire_transfer", "update_crm"}


@dataclass
class Violation:
    type: str
    severity: str
    action: str
    span_id: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


def _scan_pii(text: str | None) -> list[str]:
    if not text:
        return []
    return [name for name, pat in PII_PATTERNS.items() if pat.search(text)]


def check_pii(run: dict, spans: list[dict]) -> list[Violation]:
    violations: list[Violation] = []
    for text, where in [(run.get("user_input"), "input"), (run.get("final_output"), "output")]:
        found = _scan_pii(text)
        if found:
            violations.append(
                Violation("pii", "high", "flag", details={"detected": found, "location": where})
            )
    for s in spans:
        found = _scan_pii(str(s.get("tool_input") or "") + str(s.get("tool_output") or ""))
        if found:
            violations.append(
                Violation("pii", "high", "flag", span_id=s.get("id"),
                          details={"detected": found, "location": "tool", "tool": s.get("tool_name")})
            )
    return violations


def check_unsafe_tool(run: dict, spans: list[dict], deny: set[str] | None = None) -> list[Violation]:
    deny = deny or set()
    out = []
    for s in spans:
        if s.get("tool_name") and s["tool_name"] in deny:
            out.append(
                Violation("unsafe_tool", "high", "block", span_id=s.get("id"),
                          details={"tool": s["tool_name"]})
            )
    return out


def check_high_risk(run: dict, spans: list[dict]) -> list[Violation]:
    out = []
    for s in spans:
        if s.get("tool_name") in HIGH_RISK_TOOLS:
            out.append(
                Violation("high_risk", "high", "require_approval", span_id=s.get("id"),
                          details={"tool": s["tool_name"], "args": s.get("tool_input")})
            )
    return out


def run_sync_policies(run: dict, spans: list[dict]) -> list[Violation]:
    """All cheap, deterministic checks. Returns combined violations."""
    return [*check_pii(run, spans), *check_high_risk(run, spans)]
