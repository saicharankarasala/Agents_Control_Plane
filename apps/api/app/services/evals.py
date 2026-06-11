"""Evaluation engine.

Each evaluator takes a run dict + its spans and returns an EvalResult. The
rule-based evaluators run anywhere with no external deps; `llm_judge` requires
an Anthropic key and is invoked from the worker.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

try:
    import jsonschema  # optional
except ImportError:  # pragma: no cover
    jsonschema = None


@dataclass
class EvalResult:
    passed: bool
    score: float | None
    details: dict[str, Any]


def eval_exact(run: dict, spans: list, config: dict) -> EvalResult:
    expected = config.get("expected")
    actual = (run.get("final_output") or "").strip()
    ok = actual == str(expected).strip()
    return EvalResult(ok, 1.0 if ok else 0.0, {"expected": expected, "actual": actual})


def eval_json_schema(run: dict, spans: list, config: dict) -> EvalResult:
    schema = config.get("schema", {})
    raw = run.get("final_output") or ""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        return EvalResult(False, 0.0, {"error": f"invalid json: {e}"})
    if jsonschema is None:
        return EvalResult(True, None, {"warning": "jsonschema not installed; parse-only"})
    try:
        jsonschema.validate(data, schema)
        return EvalResult(True, 1.0, {})
    except jsonschema.ValidationError as e:  # type: ignore[attr-defined]
        return EvalResult(False, 0.0, {"error": str(e.message)})


def eval_forbidden_tool(run: dict, spans: list, config: dict) -> EvalResult:
    forbidden = set(config.get("forbidden", []))
    used = {s.get("tool_name") for s in spans if s.get("tool_name")}
    hit = used & forbidden
    return EvalResult(not hit, 0.0 if hit else 1.0, {"forbidden_used": sorted(hit)})


def eval_tool_sequence(run: dict, spans: list, config: dict) -> EvalResult:
    expected = config.get("sequence", [])
    actual = [s.get("tool_name") for s in spans if s.get("tool_name")]
    # ordered subsequence match
    it = iter(actual)
    ok = all(tool in it for tool in expected)
    return EvalResult(ok, 1.0 if ok else 0.0, {"expected": expected, "actual": actual})


EVALUATORS = {
    "exact": eval_exact,
    "json_schema": eval_json_schema,
    "forbidden_tool": eval_forbidden_tool,
    "tool_sequence": eval_tool_sequence,
}


def run_evaluator(eval_type: str, run: dict, spans: list, config: dict) -> EvalResult:
    fn = EVALUATORS.get(eval_type)
    if fn is None:
        return EvalResult(False, None, {"error": f"unknown or async-only evaluator: {eval_type}"})
    return fn(run, spans, config)
