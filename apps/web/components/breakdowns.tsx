"use client";

import Link from "next/link";
import type { RunRow } from "@/lib/api";
import { fmtCost, fmtMs } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  completed: "hsl(145 95% 45%)",
  failed: "hsl(0 90% 62%)",
  awaiting_approval: "hsl(38 95% 55%)",
  rejected: "hsl(0 70% 50%)",
  running: "hsl(170 90% 50%)",
};

export function AgentBreakdown({ runs }: { runs: RunRow[] }) {
  const map = new Map<string, { n: number; lat: number; cost: number; fail: number }>();
  for (const r of runs) {
    const k = r.agent ?? "unknown";
    const a = map.get(k) ?? { n: 0, lat: 0, cost: 0, fail: 0 };
    a.n += 1; a.lat += r.total_latency_ms; a.cost += r.total_cost_usd;
    if (r.status === "failed") a.fail += 1;
    map.set(k, a);
  }
  const all = [...map.entries()]
    .map(([agent, a]) => ({ agent, ...a, avg: a.lat / a.n, errRate: a.fail / a.n }))
    .sort((x, y) => y.n - x.n);
  const rows = all.slice(0, 10);
  const max = Math.max(1, ...all.map((r) => r.n));

  return (
    <div className="space-y-3 p-4">
      {rows.map((r) => (
        <div key={r.agent} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-xs">
          <span className="truncate font-mono">{r.agent}</span>
          <div className="relative h-5 overflow-hidden rounded bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded"
              style={{
                width: `${(r.n / max) * 100}%`,
                background: "linear-gradient(90deg, hsl(145 95% 30%), hsl(145 95% 50%))",
                boxShadow: "0 0 12px hsl(145 95% 45% / 0.5)",
              }}
            />
            <span className="absolute inset-y-0 left-2 flex items-center font-mono text-[11px] text-foreground/90">
              {r.n} runs
            </span>
          </div>
          <span className="flex gap-3 font-mono text-[11px] text-muted-foreground tabular">
            <span>{fmtMs(Math.round(r.avg))}</span>
            <span>{fmtCost(r.cost)}</span>
            <span className={r.errRate > 0.1 ? "text-red-400" : "text-[hsl(145_95%_55%)]"}>
              {(r.errRate * 100).toFixed(0)}% err
            </span>
          </span>
        </div>
      ))}
      {all.length > rows.length && (
        <Link href="/compare" className="block pt-1 text-center text-[11px] text-muted-foreground hover:text-[hsl(145_95%_60%)]">
          +{all.length - rows.length} more agents · compare all →
        </Link>
      )}
    </div>
  );
}

export function StatusBar({ runs }: { runs: RunRow[] }) {
  const counts = new Map<string, number>();
  for (const r of runs) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const total = runs.length || 1;
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4">
      <div className="flex h-3 overflow-hidden rounded-full">
        {entries.map(([s, n]) => (
          <div key={s} style={{ width: `${(n / total) * 100}%`, background: STATUS_COLOR[s] ?? "#666" }} />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {entries.map(([s, n]) => (
          <div key={s} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] ?? "#666" }} />
              <span className="capitalize">{s.replace(/_/g, " ")}</span>
            </span>
            <span className="font-mono text-muted-foreground tabular">
              {n} · {((n / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
