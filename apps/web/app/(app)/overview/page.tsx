"use client";

import {
  Activity, AlertTriangle, BarChart3, ClipboardCheck, Clock, Cpu, DollarSign,
  Gauge, Grid3x3, PieChart as PieIcon, ShieldAlert, Users, Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BarList, CostByAgent, HourHeatmap, LatencyHistogram, ModelDonut,
  Percentiles, ViolationsByType,
} from "@/components/analytics";
import { AgentBreakdown, StatusBar } from "@/components/breakdowns";
import { LiveChart } from "@/components/live-chart";
import { LiveFeed } from "@/components/live-feed";
import { MetricCard } from "@/components/metric-card";
import { Ticker } from "@/components/ticker";
import { RunsOverTime, DailyArea } from "@/components/timeseries";
import { Card, SeverityBadge } from "@/components/ui";
import { api, type Analytics, type Approval, type Overview, type RunRow, type Violation } from "@/lib/api";
import { fmtCost, fmtMs, relTime } from "@/lib/utils";

const REFRESH_MS = 4000;
const EMPTY: Overview = {
  total_runs: 0, error_rate: 0, total_cost_usd: 0,
  avg_latency_ms: 0, open_violations: 0, awaiting_approval: 0,
};

function series(runs: RunRow[], pick: (r: RunRow) => number, points = 16): number[] {
  const s = [...runs].reverse();
  if (s.length === 0) return [0, 0];
  const size = Math.max(1, Math.ceil(s.length / points));
  const out: number[] = [];
  for (let i = 0; i < s.length; i += size) {
    const c = s.slice(i, i + size);
    out.push(c.reduce((a, r) => a + pick(r), 0) / c.length);
  }
  return out.length > 1 ? out : [0, ...out];
}

function pctl(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

function Panel({ icon, title, right, children, className = "" }: {
  icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">{icon} {title}</h2>
        {right}
      </div>
      {children}
    </Card>
  );
}

const greenIcon = "text-[hsl(145_95%_50%)]";

export default function OverviewPage() {
  const [ov, setOv] = useState<Overview>(EMPTY);
  const [an, setAn] = useState<Analytics | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    async function pull() {
      const [o, r, v, a, an2] = await Promise.all([
        api.overview(), api.runs("?limit=200"), api.violations("open"), api.approvals("pending"), api.analytics(14),
      ]);
      if (!alive) return;
      setOv(o); setViolations(v.items); setApprovals(a.items); setAn(an2);
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
  const lat = runs.map((r) => r.total_latency_ms);
  const p95 = pctl(lat, 95);
  const tokens = runs.reduce((s, r) => s + r.total_tokens, 0);
  const successRate = ov.total_runs ? 1 - ov.error_rate : 0;
  const models = new Set(runs.map((r) => r.model)).size;
  const agents = new Set(runs.map((r) => r.agent)).size;

  const ticker = [
    { label: "RUNS", value: ov.total_runs.toLocaleString(), tone: "up" as const },
    { label: "SUCCESS", value: `${(successRate * 100).toFixed(1)}%`, tone: "up" as const },
    { label: "ERR", value: `${(ov.error_rate * 100).toFixed(1)}%`, tone: (ov.error_rate > 0.1 ? "down" : "neutral") as "down" | "neutral" },
    { label: "P50", value: fmtMs(pctl(lat, 50)) },
    { label: "P95", value: fmtMs(p95) },
    { label: "AVG", value: fmtMs(ov.avg_latency_ms) },
    { label: "SPEND", value: fmtCost(ov.total_cost_usd), tone: "up" as const },
    { label: "TOKENS", value: tokens.toLocaleString() },
    { label: "MODELS", value: String(models) },
    { label: "AGENTS", value: String(agents) },
    { label: "VIOLATIONS", value: String(ov.open_violations), tone: (ov.open_violations ? "down" : "neutral") as "down" | "neutral" },
    { label: "APPROVALS", value: String(ov.awaiting_approval) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Mission Control
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(145_95%_45%/0.3)] bg-[hsl(145_95%_45%/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(145_95%_55%)]">
              <span className="live-dot" /> LIVE
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time agent observability · {ov.total_runs.toLocaleString()} runs tracked
          </p>
        </div>
        <div className="font-mono text-xs text-muted-foreground tabular">
          updated {secsAgo}s ago · auto-refresh {REFRESH_MS / 1000}s
        </div>
      </div>

      <Ticker items={ticker} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <MetricCard label="Total Runs" value={ov.total_runs} icon={<Activity size={16} />} hint="last 7 days" spark={series(runs, () => 1)} />
        <MetricCard label="Success Rate" value={successRate * 100} decimals={1} suffix="%" tone="good" icon={<Gauge size={16} />} hint="completed" spark={series(runs, (r) => (r.status === "completed" ? 1 : 0))} />
        <MetricCard label="Error Rate" value={ov.error_rate * 100} decimals={1} suffix="%" tone={ov.error_rate > 0.1 ? "danger" : "good"} icon={<AlertTriangle size={16} />} hint="failed / total" spark={series(runs, (r) => (r.status === "failed" ? 1 : 0))} />
        <MetricCard label="P95 Latency" value={p95} suffix="ms" tone="info" icon={<Clock size={16} />} hint="95th pct" spark={series(runs, (r) => r.total_latency_ms)} />
        <MetricCard label="Spend" value={ov.total_cost_usd} decimals={2} prefix="$" icon={<DollarSign size={16} />} hint="token cost" spark={series(runs, (r) => r.total_cost_usd)} />
        <MetricCard label="Tokens" value={tokens} icon={<Cpu size={16} />} hint="consumed" spark={series(runs, (r) => r.total_tokens)} />
      </div>

      {/* time series */}
      {an && an.daily.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2" icon={<BarChart3 size={15} className={greenIcon} />} title="Runs & Cost · 14 days"
            right={<span className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[hsl(145_95%_50%)]" /> runs</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(170_90%_55%)]" /> cost</span>
            </span>}>
            <div className="p-4"><RunsOverTime daily={an.daily} /></div>
          </Panel>
          <Panel icon={<Clock size={15} className={greenIcon} />} title="Avg Latency Trend">
            <div className="p-4"><DailyArea daily={an.daily} field="avg_latency" color="hsl(170 90% 50%)" /></div>
          </Panel>
        </div>
      )}

      {an && an.daily.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel icon={<DollarSign size={15} className={greenIcon} />} title="Cost Trend · 14 days">
            <div className="p-4"><DailyArea daily={an.daily} field="cost" color="hsl(145 95% 50%)" /></div>
          </Panel>
          <Panel icon={<Cpu size={15} className={greenIcon} />} title="Token Consumption · 14 days">
            <div className="p-4"><DailyArea daily={an.daily} field="tokens" color="hsl(190 90% 55%)" /></div>
          </Panel>
        </div>
      )}

      {/* chart + percentiles */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" icon={<Zap size={15} className={greenIcon} />} title="Latency & Cost · recent runs"
          right={<span className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(145_95%_50%)]" /> latency</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(170_90%_50%)]" /> cost</span>
          </span>}>
          <div className="p-4"><LiveChart runs={runs} /></div>
        </Panel>
        <Panel icon={<Gauge size={15} className={greenIcon} />} title="Latency Percentiles">
          <Percentiles runs={runs} />
        </Panel>
      </div>

      {/* distributions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel icon={<PieIcon size={15} className={greenIcon} />} title="Model Usage"><ModelDonut runs={runs} /></Panel>
        <Panel icon={<BarChart3 size={15} className={greenIcon} />} title="Latency Distribution"><LatencyHistogram runs={runs} /></Panel>
        <Panel icon={<DollarSign size={15} className={greenIcon} />} title="Cost by Agent"><CostByAgent runs={runs} /></Panel>
      </div>

      {/* breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={<Users size={15} className={greenIcon} />} title="Agents"
          right={<span className="font-mono text-[11px] text-muted-foreground">runs · latency · cost · err</span>}>
          <AgentBreakdown runs={runs} />
        </Panel>
        <Panel icon={<PieIcon size={15} className={greenIcon} />} title="Run Status"><StatusBar runs={runs} /></Panel>
      </div>

      {/* heatmap */}
      <Panel icon={<Grid3x3 size={15} className={greenIcon} />} title="Activity by Hour (UTC)"
        right={<span className="font-mono text-[11px] text-muted-foreground">{runs.length} runs sampled</span>}>
        <HourHeatmap runs={runs} />
      </Panel>

      {/* governance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel icon={<ShieldAlert size={15} className="text-amber-400" />} title="Violations by Type"><ViolationsByType violations={violations} /></Panel>
        <Panel icon={<ShieldAlert size={15} className="text-amber-400" />} title="Recent Violations"
          right={<Link href="/policies" className="text-xs text-muted-foreground hover:text-foreground">view all →</Link>}>
          <div className="divide-y divide-border/60">
            {violations.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">No open violations</p>
              : violations.slice(0, 6).map((v) => (
                <Link key={v.id} href={`/runs/${v.run_id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-accent/40">
                  <span className="flex items-center gap-2"><SeverityBadge severity={v.severity} />
                    <span>{(v.details.detected as string[])?.join(", ") || (v.details.tool as string) || "policy"}</span></span>
                  <span className="text-muted-foreground">{relTime(v.created_at)}</span>
                </Link>))}
          </div>
        </Panel>
        <Panel icon={<ClipboardCheck size={15} className="text-amber-400" />} title="Pending Approvals"
          right={<Link href="/approvals" className="text-xs text-muted-foreground hover:text-foreground">review →</Link>}>
          <div className="divide-y divide-border/60">
            {approvals.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Queue is clear</p>
              : approvals.slice(0, 6).map((a) => (
                <Link key={a.id} href="/approvals" className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-accent/40">
                  <span className="flex items-center gap-2"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-400">{a.action_type}</span></span>
                  <span className="shrink-0 text-muted-foreground">{relTime(a.requested_at)}</span>
                </Link>))}
          </div>
        </Panel>
      </div>

      {/* live feed full width */}
      <Panel icon={<span className="live-dot" />} title="Live Activity"
        right={<span className="font-mono text-xs text-muted-foreground">streaming · auto-refresh</span>}>
        {runs.length === 0 ? <p className="px-4 py-10 text-center text-sm text-muted-foreground">Waiting for agent runs…</p>
          : <LiveFeed runs={runs} newIds={newIds} />}
      </Panel>
    </div>
  );
}
