"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RunRow, Violation } from "@/lib/api";
import { fmtCost, fmtMs } from "@/lib/utils";

const GREENS = ["hsl(145 95% 50%)", "hsl(170 90% 50%)", "hsl(120 70% 45%)", "hsl(190 85% 50%)", "hsl(95 70% 50%)"];

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

// ── Latency percentiles (p50/p90/p95/p99) ──
export function Percentiles({ runs }: { runs: RunRow[] }) {
  const lat = runs.map((r) => r.total_latency_ms).sort((a, b) => a - b);
  const rows = [
    { k: "p50", v: pct(lat, 50) },
    { k: "p90", v: pct(lat, 90) },
    { k: "p95", v: pct(lat, 95) },
    { k: "p99", v: pct(lat, 99) },
  ];
  const max = Math.max(1, ...rows.map((r) => r.v));
  return (
    <div className="space-y-3 p-4">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-3 text-xs">
          <span className="w-9 font-mono text-muted-foreground">{r.k}</span>
          <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
            <div className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${(r.v / max) * 100}%`, background: "linear-gradient(90deg, hsl(145 95% 28%), hsl(145 95% 50%))" }} />
          </div>
          <span className="w-14 text-right font-mono tabular">{fmtMs(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Model usage donut ──
export function ModelDonut({ runs }: { runs: RunRow[] }) {
  const m = new Map<string, number>();
  for (const r of runs) m.set(r.model ?? "unknown", (m.get(r.model ?? "unknown") ?? 0) + 1);
  const data = [...m.entries()].map(([name, value]) => ({ name: name.replace(/-\d{8}$/, ""), value }));
  return (
    <div className="p-4">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={3} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "hsl(152 12% 5%)", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-sm" style={{ background: GREENS[i % GREENS.length] }} />
              <span className="font-mono">{d.name}</span>
            </span>
            <span className="font-mono text-muted-foreground tabular">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic horizontal bar list ──
export function BarList({ data, fmt }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5 p-4">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-xs">
          <span className="truncate font-mono">{d.label}</span>
          <div className="relative h-4 overflow-hidden rounded bg-muted">
            <div className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${(d.value / max) * 100}%`, background: "linear-gradient(90deg, hsl(170 90% 28%), hsl(170 90% 50%))" }} />
          </div>
          <span className="w-16 text-right font-mono text-muted-foreground tabular">{fmt ? fmt(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CostByAgent({ runs }: { runs: RunRow[] }) {
  const m = new Map<string, number>();
  for (const r of runs) m.set(r.agent ?? "?", (m.get(r.agent ?? "?") ?? 0) + r.total_cost_usd);
  const data = [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  return <BarList data={data} fmt={fmtCost} />;
}

// ── Latency histogram ──
export function LatencyHistogram({ runs }: { runs: RunRow[] }) {
  const buckets = [
    { label: "<250ms", lo: 0, hi: 250 },
    { label: "250-500", lo: 250, hi: 500 },
    { label: "0.5-1s", lo: 500, hi: 1000 },
    { label: "1-2s", lo: 1000, hi: 2000 },
    { label: "2s+", lo: 2000, hi: Infinity },
  ];
  const counts = buckets.map((b) => ({
    ...b,
    n: runs.filter((r) => r.total_latency_ms >= b.lo && r.total_latency_ms < b.hi).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <div className="flex h-[150px] items-end gap-2 p-4">
      {counts.map((c) => (
        <div key={c.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">{c.n}</span>
          <div className="flex w-full items-end" style={{ height: 90 }}>
            <div className="w-full rounded-t"
              style={{ height: `${(c.n / max) * 100}%`, background: "linear-gradient(180deg, hsl(145 95% 55%), hsl(145 95% 30%))", boxShadow: "0 0 10px hsl(145 95% 45% / 0.4)" }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Hourly activity heatmap (24h) ──
export function HourHeatmap({ runs }: { runs: RunRow[] }) {
  const hours = new Array(24).fill(0);
  for (const r of runs) {
    if (!r.created_at) continue;
    const h = new Date(`${r.created_at}${/[zZ]|[+-]\d\d:?\d\d$/.test(r.created_at) ? "" : "Z"}`).getHours();
    hours[h] += 1;
  }
  const max = Math.max(1, ...hours);
  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-1.5">
        {hours.map((n, h) => (
          <div key={h} className="group relative aspect-square rounded-sm"
            style={{ background: `hsl(145 95% 45% / ${0.08 + (n / max) * 0.92})` }} title={`${h}:00 — ${n} runs`}>
            <span className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-card px-1 text-[9px] group-hover:block">{n}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground">
        <span>00:00</span><span>12:00</span><span>23:00</span>
      </div>
    </div>
  );
}

// ── Violations grouped by type ──
export function ViolationsByType({ violations }: { violations: Violation[] }) {
  const m = new Map<string, number>();
  for (const v of violations) {
    const det = v.details as Record<string, unknown>;
    const type = det.detected ? `pii:${(det.detected as string[])[0]}` : (det.tool as string) || "policy";
    m.set(type, (m.get(type) ?? 0) + 1);
  }
  const data = [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (data.length === 0) return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No violations</p>;
  return <BarList data={data} />;
}
