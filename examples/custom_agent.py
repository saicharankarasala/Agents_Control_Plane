"""End-to-end example: a fake refund agent traced by the ACP SDK.

Run the API first (uvicorn app.main:app), then:  python examples/custom_agent.py
The run, its spans, a high-risk policy violation, and an approval will appear
in the dashboard / database.
"""
import acp

acp.init(project="support", endpoint="http://localhost:8000")


def fake_llm(prompt: str) -> str:
    return "The customer is eligible for a $500 refund."


def issue_refund(amount: int) -> dict:
    return {"refund_id": "rf_123", "amount": amount, "status": "ok"}


def run_agent(user_input: str) -> str:
    with acp.run(agent="refund-agent", user_input=user_input, model="claude-sonnet-4-6") as run:
        with run.span("llm", name="reasoning", model="claude-sonnet-4-6") as s:
            answer = fake_llm(user_input)
            s.set_output(answer)
            s.set_tokens(input=140, output=60)

        with run.tool("issue_refund", args={"amount": 500}) as t:
            # high-risk action — backend opens an approval; in dev this fails open
            try:
                run.require_approval(t, timeout=10)
            except acp.ApprovalRejected:
                run.set_output("Refund rejected by reviewer.")
                return run.final_output
            t.set_tool_output(issue_refund(500))

        run.set_output("Refund of $500 issued. Ticket closed.")
        return run.final_output


if __name__ == "__main__":
    out = run_agent("I was double charged, please refund me.")
    print("Agent output:", out)
