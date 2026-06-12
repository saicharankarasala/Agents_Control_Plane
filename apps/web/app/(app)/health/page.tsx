"use client";

import {
  HeartPulse, AlertTriangle, CheckCircle2, XCircle, X, ChevronRight, Activity, Grid3x3, Flame,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LatencyHeatmap } from "@/components/heatmap";
import { Sparkline } from "@/components/sparkline";
import { Card, MiniStat, Panel, StatusBadge } from "@/components/ui";
import { agentInfo } from "@/lib/agents";
import { api, type Analytics, type RunDetail, type RunRow } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum, relTime } from "@/lib/utils";

type Agent = Analytics["by_agent"][number];
type Health = "healthy" | "degraded" | "down";

function health(a: Agent): { status: Health; reason: string } {
  const err = a.runs ? a.failed / a.runs : 0;
  if (a.runs > 0 && a.completed === 0) return { status: "down", reason: "all recent runs failing" };
  if (err >= 0.4) return { status: "down", reason: `${(err * 100).toFixed(0)}% error rate` };
  if (err >= 0.15) return { status: "degraded", reason: `${(err * 100).toFixed(0)}% error rate` };
  if (a.avg_latency > 2500) return { status: "degraded", reason: `slow · ${fmtMs(a.avg_latency)} avg latency` };
  return { status: "healthy", reason: "operating normally" };
}

const H_STYLE: Record<Health, { ring: string; text: string; dot: string; tile: string }> = {
  healthy: { ring: "border-[hsl(145_95%_45%/0.3)]", text: "text-[hsl(145_95%_55%)]", dot: "bg-[hsl(145_95%_50%)]", tile: "hsl(145 95% 45%)" },
  degraded: { ring: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400", tile: "hsl(38 95% 52%)" },
  down: { ring: "border-red-500/50", text: "text-red-400", dot: "bg-red-400", tile: "hsl(0 85% 55%)" },
};

export default function HealthPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [daily, setDaily] = useState<NonNullable<Analytics["by_agent_daily"]>>([]);
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<Agent | null>(null);

  useEffect(() => {
    let alive = true;
    async function pull() {
      const [an, r] = await Promise.all([api.analytics(14), api.runs("?limit=200")]);
      if (!alive) return;
      setAgents(an.by_agent.filter((x) => x.agent !== "unknown"));
      setDaily(an.by_agent_daily ?? []);
      const seen: Record<string, string> = {};
      for (const run of r.items) if (run.agent && !seen[run.agent] && run.created_at) seen[run.agent] = run.created_at;
      setLastSeen(seen);
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const order = { down: 0, degraded: 1, healthy: 2 };
  const ranked = [...agents].map((a) => ({ a, h: health(a) })).sort((x, y) => order[x.h.status] - order[y.h.status]);
  const counts = { healthy: 0, degraded: 0, down: 0 };
  ranked.forEach((r) => counts[r.h.status]++);
  const alerts = ranked.filter((r) => r.h.status !== "healthy");
  const healthyPct = agents.length ? (counts.healthy / agents.length) * 100 : 100;
  const heatAgents = [...agents].sort((a, b) => b.runs - a.runs).map((a) => a.agent);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <HeartPulse size={22} className="text-[hsl(145_95%_55%)]" /> Agent Health
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(145_95%_45%/0.3)] bg-[hsl(145_95%_45%/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(145_95%_55%)]"><span className="live-dot" /> LIVE</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">NOC view across {agents.length} agents · click any agent to inspect its pipeline</p>
        </div>
      </div>

      {/* big status tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="glass flex flex-col justify-center rounded-xl border-2 p-5"
          style={{ borderColor: counts.down ? "hsl(0 85% 55% / 0.5)" : counts.degraded ? "hsl(38 95% 52% / 0.5)" : "hsl(145 95% 45% / 0.5)" }}>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Fleet Health</span>
          <span className={`mt-1 font-mono text-4xl font-bold ${healthyPct > 90 ? "text-[hsl(145_95%_55%)]" : healthyPct > 70 ? "text-amber-400" : "text-red-400"}`}>{healthyPct.toFixed(0)}%</span>
        </div>
        <BigTile label="Healthy" value={counts.healthy} color="hsl(145 95% 50%)" Icon={CheckCircle2} />
        <BigTile label="Degraded" value={counts.degraded} color="hsl(38 95% 55%)" Icon={AlertTriangle} />
        <BigTile label="Down" value={counts.down} color="hsl(0 85% 58%)" Icon={XCircle} />
      </div>

      {/* status wall */}
      <Panel icon={<Grid3x3 size={15} className="text-[hsl(145_95%_50%)]" />} title="Agent Status Wall"
        right={<span className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[hsl(145_95%_50%)]" />healthy</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />degraded</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />down</span>
        </span>}>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {ranked.map(({ a, h }) => {
            const S = H_STYLE[h.status];
            return (
              <button key={a.agent_id ?? a.agent} onClick={() => setSel(a)} title={`${a.agent} · ${h.reason}`}
                className="group relative flex h-16 flex-col justify-between overflow-hidden rounded-md border p-2 text-left transition-transform hover:scale-[1.04]"
                style={{ borderColor: `${S.tile}66`, background: `${S.tile}14` }}>
                <span className="truncate font-mono text-[10px] leading-tight text-foreground/90">{a.agent}</span>
                <span className="flex items-center justify-between">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: S.tile, boxShadow: `0 0 8px ${S.tile}` }} />
                  <span className="font-mono text-[9px] text-muted-foreground">{(a.runs ? (a.failed / a.runs) * 100 : 0).toFixed(0)}%e</span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* latency heatmap */}
      <Panel icon={<Flame size={15} className="text-[hsl(38_95%_55%)]" />} title="Latency Heatmap · agents × days"
        right={<span className="font-mono text-[11px] text-muted-foreground">top {Math.min(22, heatAgents.length)} by volume</span>}>
        {daily.length > 0 ? <LatencyHeatmap daily={daily} agents={heatAgents} />
          : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No time-series data (redeploy backend for /v1/analytics by_agent_daily).</p>}
      </Panel>

      {/* alerts */}
      <Panel icon={<AlertTriangle size={15} className="text-amber-400" />} title="Active Alerts"
        right={<span className="font-mono text-xs text-muted-foreground">{alerts.length} firing</span>}>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-[hsl(145_95%_55%)]"><CheckCircle2 size={16} /> All agents healthy — no active alerts.</div>
        ) : (
          <div className="max-h-72 divide-y divide-border/60 overflow-y-auto">
            {alerts.map(({ a, h }) => {
              const info = agentInfo(a.agent);
              return (
                <button key={a.agent_id ?? a.agent} onClick={() => setSel(a)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/40">
                  <span className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${H_STYLE[h.status].dot} animate-pulse`} />
                    <span className="font-mono">{a.agent}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: `${info.color}1f`, color: info.color }}>{info.domain}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${H_STYLE[h.status].text}`}>{h.status.toUpperCase()} · {h.reason}</span>
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {sel && <HealthDetail agent={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function BigTile({ label, value, color, Icon }: { label: string; value: number; color: string; Icon: typeof CheckCircle2 }) {
  return (
    <div className="glass flex items-center justify-between rounded-xl border border-border p-5">
      <div>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="mt-1 font-mono text-4xl font-bold" style={{ color }}>{value}</div>
      </div>
      <Icon size={28} style={{ color, opacity: 0.4 }} />
    </div>
  );
}

const SPAN_COLOR: Record<string, string> = {
  llm: "hsl(145 95% 50%)", tool: "hsl(38 95% 55%)", retrieval: "hsl(170 90% 50%)", chain: "hsl(265 85% 65%)", guardrail: "hsl(0 85% 62%)",
};

function HealthDetail({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const info = agentInfo(agent.agent);
  const h = health(agent);
  const S = H_STYLE[h.status];
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [pipeline, setPipeline] = useState<RunDetail | null>(null);

  useEffect(() => {
    if (!agent.agent_id) return;
    api.runs(`?agent_id=${agent.agent_id}&limit=20`).then(async (r) => {
      setRuns(r.items);
      if (r.items[0]) setPipeline(await api.run(r.items[0].id));
    });
  }, [agent.agent_id]);

  const err = agent.runs ? agent.failed / agent.runs : 0;
  const latSeries = [...runs].reverse().map((x) => x.total_latency_ms);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="mt-8 w-full max-w-3xl">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-border p-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-lg font-semibold">{agent.agent}</h2>
                <span className={`flex items-center gap-1.5 rounded-full border ${S.ring} px-2 py-0.5 text-xs font-medium ${S.text}`}><span className={`h-2 w-2 rounded-full ${S.dot}`} />{h.status.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{info.purpose}</p>
              <p className={`mt-1 text-xs ${S.text}`}>● {h.reason}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
            <MiniStat label="Error Rate" value={`${(err * 100).toFixed(1)}%`} tone={err > 0.15 ? "danger" : "good"} />
            <MiniStat label="Avg Latency" value={fmtMs(agent.avg_latency)} tone="info" />
            <MiniStat label="Runs" value={fmtNum(agent.runs)} />
            <MiniStat label="Spend" value={fmtCost(agent.cost)} />
          </div>

          <div className="border-t border-border p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Activity size={13} /> Pipeline · most recent run</div>
            {pipeline && pipeline.spans.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {pipeline.spans.map((s, i) => (
                  <span key={s.id} className="flex items-center gap-2">
                    <span className="flex items-center gap-2 rounded-lg border px-3 py-2"
                      style={{ borderColor: s.status === "error" ? "hsl(0 85% 62% / 0.5)" : `${SPAN_COLOR[s.type] ?? "#666"}55`, background: s.status === "error" ? "hsl(0 85% 62% / 0.08)" : `${SPAN_COLOR[s.type] ?? "#666"}10` }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: s.status === "error" ? "hsl(0 85% 62%)" : SPAN_COLOR[s.type] ?? "#666" }} />
                      <span className="font-mono text-xs">{s.tool_name ?? s.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{fmtMs(s.latency_ms)}</span>
                      {s.status === "error" && <span className="text-[10px] font-medium text-red-400">FAIL</span>}
                    </span>
                    {i < pipeline.spans.length - 1 && <ChevronRight size={14} className="text-muted-foreground" />}
                  </span>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Loading pipeline…</p>}
          </div>

          {latSeries.length > 1 && (
            <div className="px-5 pb-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Latency · last {latSeries.length} runs</div>
              <Sparkline data={latSeries} color={info.color} width={640} height={50} />
            </div>
          )}

          <div className="border-t border-border">
            <div className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent runs</div>
            <div className="max-h-56 divide-y divide-border/60 overflow-y-auto">
              {runs.slice(0, 15).map((r) => (
                <Link key={r.id} href={`/runs/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2 text-xs hover:bg-accent/40">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.user_input}</span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular">{fmtMs(r.total_latency_ms)}</span>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
