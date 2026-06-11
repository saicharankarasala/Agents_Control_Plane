"use client";

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { RunRow } from "@/lib/api";

// Latency + cost across the most recent runs (oldest -> newest). Plotting per
// run (rather than per time bucket) keeps the chart rich even when traffic
// arrives in bursts, and it animates as new runs stream in.
export function LiveChart({ runs }: { runs: RunRow[] }) {
  const data = [...runs]
    .reverse()
    .slice(-30)
    .map((r, i) => ({
      i: i + 1,
      latency: r.total_latency_ms,
      cost: Number((r.total_cost_usd * 1000).toFixed(2)), // milli-dollars, comparable scale
      agent: r.agent,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gLat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(145 95% 50%)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(145 95% 50%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(170 90% 50%)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(170 90% 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={10}
          tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis yAxisId="lat" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false}
          axisLine={false} width={42} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : v)} />
        <YAxis yAxisId="cost" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10}
          tickLine={false} axisLine={false} width={36} tickFormatter={(v) => `$${(v / 1000).toFixed(3)}`} />
        <Tooltip
          contentStyle={{
            background: "hsl(224 33% 8%)", border: "1px solid hsl(var(--border))",
            borderRadius: 10, fontSize: 12, boxShadow: "0 10px 40px -10px hsl(243 90% 40% / .5)",
          }}
          labelFormatter={(v) => `run #${v}`}
          formatter={(val: number, name) =>
            name === "latency" ? [`${val} ms`, "latency"] : [`$${(val / 1000).toFixed(4)}`, "cost"]
          }
        />
        <Area yAxisId="lat" type="monotone" dataKey="latency" stroke="hsl(145 95% 50%)" strokeWidth={2}
          fill="url(#gLat)" animationDuration={700} />
        <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="hsl(170 90% 50%)" strokeWidth={2}
          fill="url(#gCost)" animationDuration={700} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
