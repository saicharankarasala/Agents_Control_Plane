"""Seed the running API with realistic demo traces (banking refund-agent persona).

Usage:  python seeds/generate_demo_data.py [--n 200] [--endpoint http://localhost:8000]

Generates a mix of: clean completed runs, latency outliers, failures, PII leaks,
and high-risk refund actions that land in the approval queue — so every
dashboard page has something to show.
"""
from __future__ import annotations

import argparse
import random
import uuid

import acp

AGENTS = ["refund-agent", "kyc-agent", "dispute-agent", "fraud-triage"]
QUESTIONS = [
    "I was double charged on my card, please refund me.",
    "Why was my account flagged for review?",
    "I want to dispute a $1,200 transaction from yesterday.",
    "Can you verify my identity to unlock my account?",
    "My card ending 4242 shows a charge I didn't make.",
]
MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]


def _clean_run(agent: str):
    with acp.run(agent=agent, user_input=random.choice(QUESTIONS), model=random.choice(MODELS),
                 external_run_id=str(uuid.uuid4())) as run:
        with run.span("retrieval", name="policy_lookup") as s:
            s.set_output({"docs": 3})
        with run.span("llm", name="reasoning", model=run.model) as s:
            s.set_output("Resolved the customer's question.")
            s.set_tokens(input=random.randint(200, 900), output=random.randint(80, 400))
        run.set_output("Issue resolved. Ticket closed.")


def _failure_run(agent: str):
    try:
        with acp.run(agent=agent, user_input=random.choice(QUESTIONS), model=random.choice(MODELS),
                     external_run_id=str(uuid.uuid4())) as run:
            with run.span("llm", name="reasoning", model=run.model) as s:
                s.set_tokens(input=300, output=0)
                raise RuntimeError("upstream model timeout")
    except RuntimeError:
        pass


def _pii_run(agent: str):
    with acp.run(agent=agent, user_input="My SSN is 123-45-6789 and email a@b.com",
                 model=random.choice(MODELS), external_run_id=str(uuid.uuid4())) as run:
        with run.span("llm", name="reasoning", model=run.model) as s:
            s.set_output("I've noted your SSN 123-45-6789 on file.")
            s.set_tokens(input=120, output=60)
        run.set_output("Your SSN 123-45-6789 has been recorded.")


def _high_risk_run(agent: str):
    with acp.run(agent=agent, user_input="Please refund my $500 double charge.",
                 model=random.choice(MODELS), external_run_id=str(uuid.uuid4())) as run:
        with run.span("llm", name="reasoning", model=run.model) as s:
            s.set_output("Customer eligible for $500 refund.")
            s.set_tokens(input=200, output=80)
        with run.tool("issue_refund", args={"amount": 500, "currency": "USD"}) as t:
            t.set_tool_output({"refund_id": "rf_demo", "status": "ok"})
        run.set_output("Refund of $500 issued.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=120)
    ap.add_argument("--endpoint", default="http://localhost:8000")
    args = ap.parse_args()

    acp.init(project="banking-demo", endpoint=args.endpoint)
    generators = (
        [_clean_run] * 6 + [_failure_run] * 1 + [_pii_run] * 1 + [_high_risk_run] * 2
    )
    for i in range(args.n):
        random.choice(generators)(random.choice(AGENTS))
        if (i + 1) % 25 == 0:
            print(f"  seeded {i + 1}/{args.n}")
    print(f"Done. Seeded {args.n} runs to {args.endpoint}")


if __name__ == "__main__":
    main()
