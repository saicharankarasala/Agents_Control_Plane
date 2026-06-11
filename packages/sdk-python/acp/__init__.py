"""Agent Control Plane SDK — observe, evaluate, and govern any agent loop.

    import acp
    acp.init(api_key="acp_...", project="support-bot")

    with acp.run(agent="refund-agent", user_input=q) as run:
        with run.span("llm", model="claude-sonnet-4-6") as s:
            resp = client.messages.create(...)
            s.set_output(resp.content)
            s.set_tokens(input=120, output=80)
        with run.tool("issue_refund", args={"amount": 500}) as t:
            run.require_approval(t)        # blocks until a human approves
            t.set_tool_output(do_refund())
        run.set_output(answer)
"""
from __future__ import annotations

import functools
from typing import Any, Callable

from acp.client import Client
from acp.exceptions import ACPError, ApprovalRejected, ApprovalTimeout
from acp.run import Run, Span

__all__ = [
    "init", "run", "trace", "Run", "Span",
    "ACPError", "ApprovalRejected", "ApprovalTimeout",
]

_config: dict[str, Any] = {}
_client: Client | None = None


def init(
    api_key: str | None = None,
    endpoint: str | None = None,
    project: str | None = None,
    **kwargs: Any,
) -> None:
    global _client
    _config.update(project=project, **kwargs)
    _client = Client(api_key=api_key, endpoint=endpoint, project=project)


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client()
    return _client


def run(agent: str = "default", user_input: str | None = None, **meta: Any) -> Run:
    return Run(_get_client(), agent=agent, user_input=user_input, **meta)


def trace(agent: str = "default", **meta: Any) -> Callable:
    """Decorator that wraps a function as a single traced run.

    The first positional/`user_input` arg is captured as the run input; the
    return value as the final output.
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            user_input = kwargs.get("user_input") or (str(args[0]) if args else None)
            with run(agent=agent, user_input=user_input, **meta) as r:
                result = fn(*args, **kwargs)
                r.set_output(result)
                return result

        return wrapper

    return decorator
