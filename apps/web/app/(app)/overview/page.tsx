import { Activity, AlertTriangle, ClipboardCheck, Clock, DollarSign, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { RunsChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum, relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [ov, runsRes] = await Promise.all([api.overview(), api.runs("?limit=8")]);
  const runs = runsRes.items;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Agent health across your organization — last 7 days"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Total Runs" value={fmtNum(ov.total_runs)} icon={<Activity size={16} />} />
        <MetricCard
          label="Error Rate"
          value={`${(ov.error_rate * 100).toFixed(1)}%`}
          tone={ov.error_rate > 0.1 ? "danger" : "good"}
          icon={<AlertTriangle size={16} />}
        />
        <MetricCard label="Avg Latency" value={fmtMs(ov.avg_latency_ms)} icon={<Clock size={16} />} />
        <MetricCard label="Total Cost" value={fmtCost(ov.total_cost_usd)} icon={<DollarSign size={16} />} />
        <MetricCard
          label="Open Violations"
          value={fmtNum(ov.open_violations)}
          tone={ov.open_violations > 0 ? "warn" : "good"}
          icon={<ShieldAlert size={16} />}
        />
        <MetricCard
          label="Awaiting Approval"
          value={fmtNum(ov.awaiting_approval)}
          tone={ov.awaiting_approval > 0 ? "warn" : "default"}
          icon={<ClipboardCheck size={16} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium">Run Volume</h2>
          <RunsChart runs={runs} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium">Recent Runs</h2>
          <div className="space-y-3">
            {runs.length === 0 && (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            )}
            {runs.map((r) => (
              <Link
                key={r.id}
                href={`/runs/${r.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">{r.agent}</div>
                  <div className="text-xs text-muted-foreground">{relTime(r.created_at)}</div>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
