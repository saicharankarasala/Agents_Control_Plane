"use client";

import { Activity, BarChart3, PieChart as PieIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LatencyHistogram, ModelDonut } from "@/components/analytics";
import { StatusBar } from "@/components/breakdowns";
import { Card, MiniStat, Panel, StatusBadge } from "@/components/ui";
import { api, type Analytics, type RunRow } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum, relTime } from "@/lib/utils";

const FILTERS = ["all", "completed", "failed", "awaiting_approval"];

export default function RunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [an, setAn] = useState<Analytics | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    async function pull() {
      const [r, a] = await Promise.all([api.runs("?limit=200"), api.analytics(14)]);
      if (!alive) return;
      setRuns(r.items); setAn(a);
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const shown = filter === "all" ? runs : runs.filter((r) => r.status === filter);
  const maxLat = Math.max(1, ...runs.map((r) => r.total_latency_ms));
  const t = an?.totals;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t?.runs ?? runs.length} total runs · live</p>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <MiniStat label="Total" value={fmtNum(t?.runs ?? runs.length)} />
        <MiniStat label="Error Rate" value={`${((t?.error_rate ?? 0) * 100).toFixed(1)}%`} tone={(t?.error_rate ?? 0) > 0.1 ? "danger" : "good"} />
        <MiniStat label="Avg Latency" value={fmtMs(t?.avg_latency ?? 0)} tone="info" />
        <MiniStat label="Spend" value={fmtCost(t?.cost ?? 0)} />
        <MiniStat label="Tokens" value={fmtNum(t?.tokens ?? 0)} />
        <MiniStat label="Failed" value={fmtNum(t?.failed ?? 0)} tone="warn" />
      </div>

      {/* mini analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel icon={<BarChart3 size={15} className="text-[hsl(145_95%_50%)]" />} title="Latency Distribution"><LatencyHistogram runs={runs} /></Panel>
        <Panel icon={<PieIcon size={15} className="text-[hsl(145_95%_50%)]" />} title="Model Usage"><ModelDonut runs={runs} /></Panel>
        <Panel icon={<PieIcon size={15} className="text-[hsl(145_95%_50%)]" />} title="Run Status"><StatusBar runs={runs} /></Panel>
      </div>

      {/* filters */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f ? "border-[hsl(145_95%_45%/0.5)] bg-[hsl(145_95%_45%/0.12)] text-[hsl(145_95%_60%)]"
                : "border-border text-muted-foreground hover:bg-accent/50"
            }`}>
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* dense table */}
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Input</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Latency</th>
              <th className="px-4 py-3 text-right font-medium">Tokens</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-4 py-2.5">
                  <Link href={`/runs/${r.id}`} className="font-mono text-xs font-medium hover:text-[hsl(145_95%_60%)]">{r.agent ?? "—"}</Link>
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-muted-foreground">{r.user_input ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.model?.replace(/-\d{8}$/, "") ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(r.total_latency_ms / maxLat) * 100}%`, background: "hsl(145 95% 50%)" }} />
                    </div>
                    <span className="font-mono text-[11px] tabular">{fmtMs(r.total_latency_ms)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[11px] tabular">{fmtNum(r.total_tokens)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-[11px] tabular">{fmtCost(r.total_cost_usd)}</td>
                <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">{relTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No runs match this filter.</p>}
      </Card>
    </div>
  );
}
