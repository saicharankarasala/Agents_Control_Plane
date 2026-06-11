"""Backfill historical demo runs spread across the last N days, so the
dashboard's time-series and heatmaps look rich. Stdlib only.

    python seeds/backfill.py --endpoint https://acp-api.venkatasaicharan.com --days 14 --per-day 45
"""
from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone

import live_traffic as lt


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", default="http://localhost:8000")
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--per-day", type=int, default=45)
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    ok = 0
    for d in range(args.days):
        day = now - timedelta(days=d)
        # more traffic on recent days, business-hours weighting
        n = int(args.per_day * (0.6 + 0.4 * (args.days - d) / args.days))
        for _ in range(n):
            hour = random.choices(range(24), weights=[1,1,1,1,1,1,2,4,6,7,8,8,7,8,8,7,6,5,4,3,2,2,1,1])[0]
            when = day.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
            try:
                if lt._post(args.endpoint, lt._build(when=when)) == 200:
                    ok += 1
            except Exception as e:
                print("err", e); return
        print(f"  day -{d}: {n} runs", flush=True)
    print(f"Backfilled {ok} runs across {args.days} days → {args.endpoint}")


if __name__ == "__main__":
    main()
