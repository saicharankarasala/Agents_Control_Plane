"""Built-in price table (USD per 1M tokens) for cost estimation.

Approximate list prices; override via acp.init(prices=...) for exact accounting.
"""
from __future__ import annotations

# (input_per_1m, output_per_1m)
PRICES: dict[str, tuple[float, float]] = {
    "claude-opus-4-8": (15.0, 75.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-haiku-4-5-20251001": (0.80, 4.0),
    "gpt-4o": (2.5, 10.0),
    "gpt-4o-mini": (0.15, 0.60),
}


def estimate_cost(model: str | None, input_tokens: int = 0, output_tokens: int = 0) -> float:
    if not model:
        return 0.0
    rate = PRICES.get(model)
    if rate is None:
        # match by prefix (e.g. versioned model ids)
        for key, val in PRICES.items():
            if model.startswith(key.split("-2")[0]):
                rate = val
                break
    if rate is None:
        return 0.0
    return round(input_tokens / 1e6 * rate[0] + output_tokens / 1e6 * rate[1], 6)
