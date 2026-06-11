# Agent Control Plane — Python SDK

Observability, evaluation, and governance for any AI agent. Wrap your agent loop
and capture every run, span, tool call, token, cost, error, and policy violation.

```bash
pip install agent-control-plane
```

```python
import acp
acp.init(api_key="acp_...", project="support-bot", endpoint="http://localhost:8000")

@acp.trace(agent="refund-agent")
def handle(user_input: str) -> str:
    ...

# or, for fine-grained spans:
with acp.run(agent="refund-agent", user_input=q) as run:
    with run.span("llm", model="claude-sonnet-4-6") as s:
        s.set_output(resp); s.set_tokens(input=120, output=80)
    with run.tool("issue_refund", args={"amount": 500}) as t:
        run.require_approval(t)          # blocks until a human approves
        t.set_tool_output(do_refund())
    run.set_output(answer)
```

**LangChain:** `agent.invoke(x, config={"callbacks": [ACPCallbackHandler(agent="support")]})`

The SDK **fails open** — network or API errors never break your agent.

MIT licensed.
