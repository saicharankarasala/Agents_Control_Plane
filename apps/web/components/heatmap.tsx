"use client";

import { useState } from "react";
import type { Analytics } from "@/lib/api";
import { fmtMs } from "@/lib/utils";

// latency → blue(low) → green → yellow → red(high), Grafana-style
function heat(t: number): string {
  const hue = 220 - Math.max(0, Math.min(1, t)) * 220; // 220=blue → 0=red
  return `hsl(${hue} 85% ${42 + (1 - t) * 6}%)`;
}

export function LatencyHeatmap({
  daily, agents, metric = "avg_latency",
}: {
  daily: NonNullable<Analytics["by_agent_daily"]>;
  agents: string[];
  metric?: "avg_latency" | "runs" | "failed";
}) {
  const [hover, setHover] = useState<string | null>(null);
  const dates = Array.from(new Set(daily.map((d) => d.date))).sort().slice(-14);
  const cell = new Map<string, { v: number; runs: number; lat: number; fail: number }>();
  let max = 1;
  for (const d of daily) {
    const v = d[metric];
    cell.set(`${d.agent}|${d.date}`, { v, runs: d.runs, lat: d.avg_latency, fail: d.failed });
    if (v > max) max = v;
  }
  const rows = agents.slice(0, 22);

  return (
    <div className="overflow-x-auto p-4">
      <div className="min-w-[640px]">
        {rows.map((agent) => (
          <div key={agent} className="flex items-center gap-1">
            <span className="w-32 shrink-0 truncate py-0.5 text-right font-mono text-[10px] text-muted-foreground">{agent}</span>
            <div className="flex gap-1">
              {dates.map((date) => {
                const c = cell.get(`${agent}|${date}`);
                const t = c ? c.v / max : 0;
                return (
                  <div key={date}
                    onMouseEnter={() => setHover(c ? `${agent} · ${date} · ${fmtMs(c.lat)} · ${c.runs} runs${c.fail ? ` · ${c.fail} failed` : ""}` : null)}
                    onMouseLeave={() => setHover(null)}
                    className="h-5 w-5 rounded-[3px] transition-transform hover:scale-125"
                    style={{ background: c ? heat(t) : "hsl(150 8% 12%)" }} />
                );
              })}
            </div>
          </div>
        ))}
        <div className="ml-32 mt-2 flex items-center gap-2 pl-1 text-[10px] text-muted-foreground">
          <span>low</span>
          <div className="h-2 w-40 rounded" style={{ background: "linear-gradient(90deg, hsl(220 85% 45%), hsl(160 85% 45%), hsl(90 85% 45%), hsl(45 85% 48%), hsl(0 85% 48%))" }} />
          <span>high latency</span>
          <span className="ml-auto font-mono">{hover ?? "hover a cell"}</span>
        </div>
      </div>
    </div>
  );
}
