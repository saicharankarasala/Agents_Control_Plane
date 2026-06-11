"""LangChain integration: one-line tracing via a callback handler.

    from acp.langchain import ACPCallbackHandler
    agent.invoke(input, config={"callbacks": [ACPCallbackHandler(agent="support")]})

Imports of langchain are deferred so the base SDK has no LangChain dependency.
"""
from __future__ import annotations

from typing import Any

try:
    from langchain_core.callbacks import BaseCallbackHandler
except Exception:  # pragma: no cover - langchain optional
    BaseCallbackHandler = object  # type: ignore[assignment,misc]

import acp


class ACPCallbackHandler(BaseCallbackHandler):  # type: ignore[misc]
    """Maps LangChain callback events onto ACP runs and spans."""

    def __init__(self, agent: str = "langchain-agent", **meta: Any):
        self.agent = agent
        self.meta = meta
        self._run: acp.Run | None = None
        self._open: dict[str, acp.Span] = {}

    def on_chain_start(self, serialized, inputs, **kwargs):
        if self._run is None:
            text = inputs.get("input") if isinstance(inputs, dict) else str(inputs)
            self._run = acp.run(agent=self.agent, user_input=str(text), framework="langchain", **self.meta)

    def on_llm_start(self, serialized, prompts, *, run_id=None, **kwargs):
        if self._run:
            model = (serialized or {}).get("name", "llm")
            span = self._run.span("llm", model=model, input={"prompts": prompts})
            self._open[str(run_id)] = span.__enter__()

    def on_llm_end(self, response, *, run_id=None, **kwargs):
        span = self._open.pop(str(run_id), None)
        if span:
            try:
                usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
                span.set_tokens(usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
            except Exception:
                pass
            span.__exit__(None, None, None)

    def on_tool_start(self, serialized, input_str, *, run_id=None, **kwargs):
        if self._run:
            name = (serialized or {}).get("name", "tool")
            span = self._run.tool(name, args={"input": input_str})
            self._open[str(run_id)] = span.__enter__()

    def on_tool_end(self, output, *, run_id=None, **kwargs):
        span = self._open.pop(str(run_id), None)
        if span:
            span.set_tool_output(str(output))
            span.__exit__(None, None, None)

    def on_chain_end(self, outputs, **kwargs):
        if self._run:
            self._run.set_output(outputs.get("output") if isinstance(outputs, dict) else outputs)
            self._run.__exit__(None, None, None)
            self._run = None
