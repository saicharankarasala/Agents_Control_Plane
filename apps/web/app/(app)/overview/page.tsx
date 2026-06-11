"use client";

import {
  Activity, AlertTriangle, ClipboardCheck, Clock, DollarSign, ShieldAlert, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LiveChart } from "@/components/live-chart";
import { LiveFeed } from "@/components/live-feed";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui";
import { api, type Overview, type RunRow } from "@/lib/api";

const REFRESH_MS = 5000;

const EMPTY: Overview = {
  total_runs: 0, error_rate: 0, total_cost_usd: 0,
  avg_latency_ms: 0, open_violations: 0, awaiting_approval: 0,
};

// build a small N-point series from runs for the sparklines
function series(runs: RunRow[], pick: (r: RunRow) => number, points = 14): number[] {
  const sorted = [...runs].reverse(); // oldest first
  if (sorted.length === 0) return [0, 0];
  const size = Math.max(1, Math.ceil(sorted.length / points));
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    out.push(chunk.reduce((s, r) => s + pick(r), 0) / chunk.length);
  }
  return out.length > 1 ? out : [0, ...out];
}

export default function OverviewPage() {
  const [ov, setOv] = useState<Overview>(EMPTY);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    async function pull() {
      const [o, r] = await Promise.all([api.overview(), api.runs("?limit=40")]);
      if (!alive) return;
      setOv(o);
      const fresh = r.items.filter((x) => !seenRef.current.has(x.id)).map((x) => x.id);
      if (seenRef.current.size > 0 && fresh.length) {
        setNewIds(new Set(fresh));
        setTimeout(() => alive && setNewIds(new Set()), 1500);
      }
      r.items.forEach((x) => seenRef.current.add(x.id));
      setRuns(r.items);
      setUpdated(new Date());
    }
    pull();
    const iv = setInterval(pull, REFRESH_MS);
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { alive = false; clearInterval(iv); clearInterval(clock); };
  }, []);

  const secsAgo = updated ? Math.floor((Date.now() - updated.getTime()) / 1000) : 0;

  return (
    <div>
      {/* status bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Mission Control
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <span className="live-dot" /> LIVE
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time agent observability · {ov.total_runs} runs tracked
          </p>
        </div>
        <div className="font-mono text-xs text-muted-foreground tabular">
          updated {secsAgo}s ago · auto-refresh {REFRESH_MS / 1000}s
        </div>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total Runs" value={ov.total_runs} icon={<Activity size={16} />}
          hint="last 7 days" spark={series(runs, () => 1)} />
        <MetricCard label="Error Rate" value={ov.error_rate * 100} decimals={1} suffix="%"
          tone={ov.error_rate > 0.1 ? "danger" : "good"} icon={<AlertTriangle size={16} />}
          hint="failed / total" spark={series(runs, (r) => (r.status === "failed" ? 1 : 0))} />
        <MetricCard label="Avg Latency" value={ov.avg_latency_ms} suffix="ms" tone="info"
          icon={<Clock size={16} />} hint="per run" spark={series(runs, (r) => r.total_latency_ms)} />
        <MetricCard label="Spend" value={ov.total_cost_usd} decimals={2} prefix="$"
          icon={<DollarSign size={16} />} hint="token cost" spark={series(runs, (r) => r.total_cost_usd)} />
        <MetricCard label="Violations" value={ov.open_violations}
          tone={ov.open_violations > 0 ? "warn" : "good"} icon={<ShieldAlert size={16} />} hint="open" />
        <MetricCard label="Approvals" value={ov.awaiting_approval}
          tone={ov.awaiting_approval > 0 ? "warn" : "default"} icon={<ClipboardCheck size={16} />} hint="awaiting" />
      </div>

      {/* chart + feed */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="glass p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Zap size={15} className="text-[hsl(243_90%_68%)]" /> Latency &amp; Cost · recent runs
            </h2>
            <span className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(190_90%_55%)]" /> latency</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(243_90%_68%)]" /> cost</span>
            </span>
          </div>
          <LiveChart runs={runs} />
        </Card>

        <Card className="glass xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <span className="live-dot" /> Live Activity
            </h2>
            <span className="font-mono text-xs text-muted-foreground">streaming</span>
          </div>
          {runs.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Waiting for agent runs…</p>
          ) : (
            <LiveFeed runs={runs} newIds={newIds} />
          )}
        </Card>
      </div>
    </div>
  );
}
