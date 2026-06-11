"use client";

import { GitCompare, X, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkline } from "@/components/sparkline";
import { Card, MiniStat, Panel, StatusBadge } from "@/components/ui";
import { agentInfo } from "@/lib/agents";
import { api, type Analytics, type RunRow } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum, relTime } from "@/lib/utils";

type AgentRow = Analytics["by_agent"][number];

export default function ComparePage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [domain, setDomain] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AgentRow | null>(null);

  useEffect(() => {
    let alive = true;
    async function pull() {
      const a = await api.analytics(14);
      if (alive) setAgents(a.by_agent.filter((x) => x.agent !== "unknown").sort((x, y) => y.runs - x.runs));
    }
    pull();
    const iv = setInterval(pull, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const domains = ["all", ...Array.from(new Set(agents.map((a) => agentInfo(a.agent).domain))).sort()];
  const shown = agents.filter((a) => {
    const info = agentInfo(a.agent);
    return (domain === "all" || info.domain === domain) && a.agent.toLowerCase().includes(query.toLowerCase());
  });

  const maxRuns = Math.max(1, ...agents.map((a) => a.runs));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {agents.length} agents across {domains.length - 1} domains · click any agent to see what it does
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Agents" value={String(agents.length)} tone="good" />
        <MiniStat label="Domains" value={String(domains.length - 1)} />
        <MiniStat label="Total Runs" value={fmtNum(agents.reduce((s, a) => s + a.runs, 0))} />
        <MiniStat label="Total Spend" value={fmtCost(agents.reduce((s, a) => s + a.cost, 0))} />
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm">
          <Search size={14} className="text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search agents…"
            className="w-40 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        {domains.map((d) => (
          <button key={d} onClick={() => setDomain(d)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              domain === d ? "border-[hsl(145_95%_45%/0.5)] bg-[hsl(145_95%_45%/0.12)] text-[hsl(145_95%_60%)]"
                : "border-border text-muted-foreground hover:bg-accent/50"}`}>{d}</button>
        ))}
      </div>

      {/* agent grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((a) => {
          const info = agentInfo(a.agent);
          const err = a.runs ? a.failed / a.runs : 0;
          const success = a.runs ? a.completed / a.runs : 0;
          return (
            <button key={a.agent_id ?? a.agent} onClick={() => setSelected(a)}
              className="glass glow-hover rounded-xl border border-border p-4 text-left">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium">{a.agent}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: `${info.color}1f`, color: info.color }}>{info.domain}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 h-8 text-[11px] text-muted-foreground">{info.purpose}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-2xl font-semibold" style={{ color: info.color }}>{(success * 100).toFixed(0)}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">success</div>
                </div>
                <div className="text-right font-mono text-[11px] text-muted-foreground tabular">
                  <div>{fmtNum(a.runs)} runs</div>
                  <div>{fmtMs(a.avg_latency)}</div>
                  <div>{fmtCost(a.cost)}</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(a.runs / maxRuns) * 100}%`, background: info.color }} />
              </div>
            </button>
          );
        })}
      </div>

      {selected && <AgentDetail row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AgentDetail({ row, onClose }: { row: AgentRow; onClose: () => void }) {
  const info = agentInfo(row.agent);
  const [runs, setRuns] = useState<RunRow[]>([]);

  useEffect(() => {
    if (!row.agent_id) return;
    api.runs(`?agent_id=${row.agent_id}&limit=40`).then((r) => setRuns(r.items));
  }, [row.agent_id]);

  const err = row.runs ? row.failed / row.runs : 0;
  const success = row.runs ? row.completed / row.runs : 0;
  const latSeries = [...runs].reverse().map((r) => r.total_latency_ms);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="mt-10 w-full max-w-2xl" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-border p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `${info.color}1f`, color: info.color }}><GitCompare size={18} /></span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono text-lg font-semibold">{row.agent}</h2>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${info.color}1f`, color: info.color }}>{info.domain}</span>
                </div>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{info.purpose}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
            <MiniStat label="Success" value={`${(success * 100).toFixed(0)}%`} tone="good" />
            <MiniStat label="Runs" value={fmtNum(row.runs)} />
            <MiniStat label="Avg Latency" value={fmtMs(row.avg_latency)} tone="info" />
            <MiniStat label="Error Rate" value={`${(err * 100).toFixed(1)}%`} tone={err > 0.1 ? "danger" : "good"} />
            <MiniStat label="Spend" value={fmtCost(row.cost)} />
            <MiniStat label="Tokens" value={fmtNum(row.tokens)} />
            <MiniStat label="Completed" value={fmtNum(row.completed)} />
            <MiniStat label="Failed" value={fmtNum(row.failed)} tone="warn" />
          </div>

          {latSeries.length > 1 && (
            <div className="px-5 pb-2">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Latency · last {latSeries.length} runs</div>
              <Sparkline data={latSeries} color={info.color} width={560} height={56} />
            </div>
          )}

          <div className="border-t border-border">
            <div className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent runs</div>
            <div className="max-h-64 divide-y divide-border/60 overflow-y-auto">
              {runs.slice(0, 20).map((r) => (
                <Link key={r.id} href={`/runs/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2 text-xs hover:bg-accent/40">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.user_input}</span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular">{fmtMs(r.total_latency_ms)}</span>
                  <StatusBadge status={r.status} />
                  <span className="w-12 text-right text-[11px] text-muted-foreground">{relTime(r.created_at)}</span>
                </Link>
              ))}
              {runs.length === 0 && <p className="px-5 py-6 text-center text-sm text-muted-foreground">Loading recent runs…</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
