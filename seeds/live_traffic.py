"""Continuous demo traffic generator — makes the live dashboard actually move.

Self-contained (stdlib only, no SDK/deps) so it runs in a bare python image.
Posts a realistic traced run to the ingest API every few seconds: a mix of
clean completions, failures, PII leaks, and high-risk refunds (which open
approvals). Run it as the `traffic` service (profile: live) or standalone:

    python seeds/live_traffic.py --endpoint https://acp-api.venkatasaicharan.com --interval 7
"""
from __future__ import annotations

import argparse
import json
import random
import urllib.request
from datetime import datetime, timedelta, timezone
from uuid import uuid4

AGENTS = [
    # banking / fintech
    "refund-agent", "dispute-agent", "fraud-triage", "kyc-agent", "aml-screening",
    "credit-underwriter", "wire-transfer-agent", "statement-assistant", "card-services",
    "collections-agent",
    # healthcare / payer
    "claims-processor", "prior-auth-agent", "eligibility-checker", "denial-appeals",
    "coding-assistant", "care-navigator",
    # insurance
    "policy-quote-agent", "claims-fnol", "underwriting-risk", "renewal-agent",
    # support / saas
    "support-tier1", "support-escalation", "billing-assistant", "onboarding-guide",
    "churn-saver", "knowledge-bot",
    # sales / marketing
    "lead-qualifier", "proposal-writer", "crm-updater", "outreach-agent",
    # legal / compliance
    "contract-reviewer", "compliance-monitor", "policy-rag", "redaction-agent",
    # devops / internal
    "incident-responder", "log-analyzer", "deploy-approver", "runbook-agent",
    # hr / ops
    "recruiting-screener", "hr-helpdesk", "expense-auditor",
]
MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
QUESTIONS = [
    "I was double charged on my card, please refund me.",
    "Why was my account flagged for review?",
    "I want to dispute a $1,200 transaction from yesterday.",
    "Can you verify my identity to unlock my account?",
    "My card ending 4242 shows a charge I didn't make.",
]


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _post(endpoint: str, batch: dict) -> int:
    req = urllib.request.Request(
        f"{endpoint}/v1/traces",
        data=json.dumps(batch).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status


def _build(when: datetime | None = None) -> dict:
    agent = random.choice(AGENTS)
    model = random.choice(MODELS)
    kind = random.choices(["clean", "fail", "pii", "refund"], weights=[6, 1, 1, 2])[0]
    start = when or datetime.now(timezone.utc)
    spans: list[dict] = []
    t = start
    seq = 0

    def add(type_, name, latency_ms, **extra):
        nonlocal t, seq
        seq += 1
        span = {
            "type": type_, "name": name, "status": "ok", "sequence": seq,
            "latency_ms": latency_ms, "tokens": extra.pop("tokens", 0),
            "cost_usd": extra.pop("cost_usd", 0.0),
            "started_at": _iso(t), "ended_at": _iso(t + timedelta(milliseconds=latency_ms)),
            **extra,
        }
        spans.append(span)
        t = t + timedelta(milliseconds=latency_ms)

    add("retrieval", "context_lookup", random.randint(40, 220), output={"docs": 3})
    in_tok, out_tok = random.randint(150, 900), random.randint(60, 400)
    cost = round(in_tok / 1e6 * 3 + out_tok / 1e6 * 15, 6)

    if kind == "fail":
        add("llm", "reasoning", random.randint(200, 700), tokens=in_tok, cost_usd=cost,
            status="error", error="upstream model timeout")
        status, final = "failed", None
    elif kind == "pii":
        add("llm", "reasoning", random.randint(300, 1200), tokens=in_tok, cost_usd=cost,
            output={"value": "Noted SSN 123-45-6789 on file."})
        status, final = "completed", "Your SSN 123-45-6789 has been recorded."
    elif kind == "refund":
        add("llm", "reasoning", random.randint(400, 1500), tokens=in_tok, cost_usd=cost,
            output={"value": "Customer eligible for $500 refund."})
        add("tool", "issue_refund", random.randint(300, 1000),
            tool_name="issue_refund", tool_input={"amount": 500, "currency": "USD"},
            tool_output={"refund_id": "rf_live", "status": "ok"})
        status, final = "completed", "Refund of $500 issued."
    else:
        add("llm", "reasoning", random.randint(300, 1400), tokens=in_tok, cost_usd=cost,
            output={"value": "Resolved the customer's question."})
        status, final = "completed", "Issue resolved. Ticket closed."

    total_latency = int((t - start).total_seconds() * 1000)
    user_input = "My SSN is 123-45-6789" if kind == "pii" else random.choice(QUESTIONS)
    run = {
        "external_run_id": str(uuid4()), "agent": agent, "framework": "custom",
        "project": "banking-demo", "status": status, "user_input": user_input,
        "final_output": final, "model": model, "metadata": {"source": "live-traffic"},
        "total_latency_ms": total_latency, "total_tokens": in_tok + out_tok,
        "total_cost_usd": cost, "started_at": _iso(start), "ended_at": _iso(t),
    }
    if when is not None:
        run["created_at"] = _iso(when)  # backfill historical timestamp
    return {"run": run, "spans": spans}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", default="http://api:8000")
    ap.add_argument("--interval", type=float, default=7.0)
    args = ap.parse_args()
    print(f"live-traffic → {args.endpoint} every ~{args.interval}s", flush=True)
    import time

    while True:
        try:
            code = _post(args.endpoint, _build())
            print(f"  posted run ({code})", flush=True)
        except Exception as e:  # keep the generator resilient
            print(f"  post failed: {e}", flush=True)
        time.sleep(args.interval + random.uniform(-2, 4))


if __name__ == "__main__":
    main()
