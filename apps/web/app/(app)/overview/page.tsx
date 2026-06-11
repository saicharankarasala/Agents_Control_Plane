"use client";

import {
  Activity, AlertTriangle, ClipboardCheck, Clock, DollarSign, ShieldAlert, Zap,
  Users, PieChart,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AgentBreakdown, StatusBar } from "@/components/breakdowns";
import { LiveChart } from "@/components/live-chart";
import { LiveFeed } from "@/components/live-feed";
import { MetricCard } from "@/components/metric-card";
import { Card, SeverityBadge } from "@/components/ui";
import { api, type Approval, type Overview, type RunRow, type Violation } from "@/lib/api";
import { relTime } from "@/lib/utils";

const REFRESH_MS = 4000;
const EMPTY: Overview = {
  total_runs: 0, error_rate: 0, total_cost_usd: 0,
  avg_latency_ms: 0, open_violations: 0, awaiting_approval: 0,
};

function series(runs: RunRow[], pick: (r: RunRow) => number, points = 16): number[] {
  const sorted = [...runs].reverse();
  if (sorted.length === 0) return [0, 0];
  const size = Math.max(1, Math.ceil(sorted.length / points));
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    out.push(chunk.reduce((s, r) => s + pick(r), 0) / chunk.length);
  }
  return out.length > 1 ? out : [0, ...out];
}

function PanelHead({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">{icon} {title}</h2>
      {right}
    </div>
  );
}

export default function OverviewPage() {
  const [ov, setOv] = useState<Overview>(EMPTY);
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
      const [o, r, v, a] = await Promise.all([
        api.overview(), api.runs("?limit=200"), api.violations("open"), api.approvals("pending"),
      ]);
      if (!alive) return;
      setOv(o); setViolations(v.items); setApprovals(a.items);
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

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <PanelHead
            icon={<Zap size={15} className="text-[hsl(145_95%_50%)]" />}
            title="Latency & Cost · recent runs"
            right={
              <span className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(145_95%_50%)]" /> latency</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(170_90%_50%)]" /> cost</span>
              </span>
            }
          />
          <div className="p-4"><LiveChart runs={runs} /></div>
        </Card>

        <Card className="xl:col-span-2">
          <PanelHead icon={<span className="live-dot" />} title="Live Activity"
            right={<span className="font-mono text-xs text-muted-foreground">streaming</span>} />
          {runs.length === 0
            ? <p className="px-4 py-10 text-center text-sm text-muted-foreground">Waiting for agent runs…</p>
            : <LiveFeed runs={runs} newIds={newIds} />}
        </Card>
      </div>

      {/* breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <PanelHead icon={<Users size={15} className="text-[hsl(145_95%_50%)]" />} title="Agents"
            right={<span className="font-mono text-[11px] text-muted-foreground">runs · latency · cost · err</span>} />
          <AgentBreakdown runs={runs} />
        </Card>
        <Card>
          <PanelHead icon={<PieChart size={15} className="text-[hsl(145_95%_50%)]" />} title="Run Status" />
          <StatusBar runs={runs} />
        </Card>
      </div>

      {/* governance row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <PanelHead icon={<ShieldAlert size={15} className="text-amber-400" />} title="Recent Violations"
            right={<Link href="/policies" className="text-xs text-muted-foreground hover:text-foreground">view all →</Link>} />
          <div className="divide-y divide-border/60">
            {violations.length === 0
              ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">No open violations</p>
              : violations.slice(0, 6).map((v) => (
                <Link key={v.id} href={`/runs/${v.run_id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-accent/40">
                  <span className="flex items-center gap-2">
                    <SeverityBadge severity={v.severity} />
                    <span>{(v.details.detected as string[])?.join(", ") || (v.details.tool as string) || "policy"}</span>
                  </span>
                  <span className="text-muted-foreground">{relTime(v.created_at)}</span>
                </Link>
              ))}
          </div>
        </Card>
        <Card>
          <PanelHead icon={<ClipboardCheck size={15} className="text-amber-400" />} title="Pending Approvals"
            right={<Link href="/approvals" className="text-xs text-muted-foreground hover:text-foreground">review →</Link>} />
          <div className="divide-y divide-border/60">
            {approvals.length === 0
              ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Queue is clear</p>
              : approvals.slice(0, 6).map((a) => (
                <Link key={a.id} href="/approvals" className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-accent/40">
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-400">{a.action_type}</span>
                    <span className="truncate text-muted-foreground">{a.risk_reason}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">{relTime(a.requested_at)}</span>
                </Link>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
