"use client";

import { GitCompare } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, Panel } from "@/components/ui";
import { api, type RunRow } from "@/lib/api";
import { fmtCost, fmtMs } from "@/lib/utils";

interface AgentStat {
  agent: string; runs: number; avgLat: number; cost: number; tokens: number; errRate: number; success: number;
}

function compute(runs: RunRow[]): AgentStat[] {
  const m = new Map<string, { n: number; lat: number; cost: number; tok: number; fail: number; ok: number }>();
  for (const r of runs) {
    const k = r.agent ?? "unknown";
    const a = m.get(k) ?? { n: 0, lat: 0, cost: 0, tok: 0, fail: 0, ok: 0 };
    a.n++; a.lat += r.total_latency_ms; a.cost += r.total_cost_usd; a.tok += r.total_tokens;
    if (r.status === "failed") a.fail++; if (r.status === "completed") a.ok++;
    m.set(k, a);
  }
  return [...m.entries()].map(([agent, a]) => ({
    agent, runs: a.n, avgLat: a.lat / a.n, cost: a.cost, tokens: a.tok,
    errRate: a.fail / a.n, success: a.ok / a.n,
  })).sort((x, y) => y.runs - x.runs);
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${(value / (max || 1)) * 100}%`, background: color }} />
      </div>
      <span className="w-16 text-right font-mono text-[11px] tabular text-muted-foreground">{label}</span>
    </div>
  );
}

export default function ComparePage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  useEffect(() => {
    let alive = true;
    async function pull() { const r = await api.runs("?limit=200"); if (alive) setRuns(r.items); }
    pull(); const iv = setInterval(pull, 6000); return () => { alive = false; clearInterval(iv); };
  }, []);

  const stats = compute(runs);
  const maxRuns = Math.max(1, ...stats.map((s) => s.runs));
  const maxLat = Math.max(1, ...stats.map((s) => s.avgLat));
  const maxCost = Math.max(1, ...stats.map((s) => s.cost));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Side-by-side volume, latency, cost, and reliability</p>
      </div>

      {stats.length === 0 ? (
        <Card><div className="flex flex-col items-center py-16 text-muted-foreground"><GitCompare size={28} /><p className="mt-3">No agent data yet</p></div></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <Panel key={s.agent} icon={<GitCompare size={15} className="text-[hsl(145_95%_50%)]" />} title={s.agent}>
              <div className="space-y-4 p-4">
                <div>
                  <div className="font-mono text-3xl font-semibold text-[hsl(145_95%_55%)]">{(s.success * 100).toFixed(0)}%</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">success rate</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] uppercase text-muted-foreground">Runs</div>
                  <Bar value={s.runs} max={maxRuns} color="hsl(145 95% 50%)" label={String(s.runs)} />
                  <div className="text-[11px] uppercase text-muted-foreground">Avg Latency</div>
                  <Bar value={s.avgLat} max={maxLat} color="hsl(170 90% 50%)" label={fmtMs(Math.round(s.avgLat))} />
                  <div className="text-[11px] uppercase text-muted-foreground">Cost</div>
                  <Bar value={s.cost} max={maxCost} color="hsl(190 85% 50%)" label={fmtCost(s.cost)} />
                  <div className="flex justify-between pt-1 text-[11px]">
                    <span className="text-muted-foreground">error rate</span>
                    <span className={`font-mono ${s.errRate > 0.1 ? "text-red-400" : "text-[hsl(145_95%_55%)]"}`}>{(s.errRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
