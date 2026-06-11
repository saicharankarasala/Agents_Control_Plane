"""SDK unit tests — no network; the client is monkeypatched to capture payloads."""
import acp
from acp.pricing import estimate_cost


class FakeClient:
    def __init__(self):
        self.sent = []

    def send_trace(self, payload):
        self.sent.append(payload)
        return {"run_id": "r1", "status": payload["run"]["status"]}

    def wait_for_approval(self, approval_id, timeout=300, interval=2.0):
        return {"status": "approved"}


def test_run_captures_spans_and_cost():
    acp.init(endpoint="http://x")
    acp._client = FakeClient()  # inject fake transport

    with acp.run(agent="t", user_input="hi", model="claude-sonnet-4-6") as run:
        with run.span("llm", model="claude-sonnet-4-6") as s:
            s.set_output("answer")
            s.set_tokens(input=1000, output=1000)
        with run.tool("issue_refund", args={"amount": 5}) as t:
            t.set_tool_output({"ok": True})
        run.set_output("done")

    payload = acp._client.sent[-1]
    assert payload["run"]["status"] == "completed"
    assert payload["run"]["final_output"] == "done"
    assert len(payload["spans"]) == 2
    assert payload["run"]["total_tokens"] == 2000
    assert payload["run"]["total_cost_usd"] > 0


def test_trace_decorator():
    acp.init(endpoint="http://x")
    acp._client = FakeClient()

    @acp.trace(agent="dec")
    def handle(user_input: str) -> str:
        return "result"

    assert handle("question") == "result"
    assert acp._client.sent[-1]["run"]["final_output"] == "result"


def test_pricing():
    # 1M in + 1M out on sonnet = 3 + 15 = 18
    assert estimate_cost("claude-sonnet-4-6", 1_000_000, 1_000_000) == 18.0
    assert estimate_cost(None, 100, 100) == 0.0


def test_fail_open_on_dead_endpoint():
    # real client pointing nowhere must not raise
    acp.init(endpoint="http://127.0.0.1:1")
    with acp.run(agent="t", user_input="hi") as run:
        run.set_output("x")
    # no exception == pass
