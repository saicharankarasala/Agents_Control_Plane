"use client";

import {
  Area, AreaChart, Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { Analytics } from "@/lib/api";

// Runs (bars) + cost (line) over the last N days — real server-side trend.
export function RunsOverTime({ daily }: { daily: Analytics["daily"] }) {
  const data = daily.map((d) => ({
    day: d.date.slice(5), runs: d.runs, cost: Number((d.cost).toFixed(3)),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="tsRuns" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(145 95% 50%)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="hsl(145 95% 30%)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={32} />
        <YAxis yAxisId="r" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10}
          tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={{ background: "hsl(152 12% 5%)", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="runs" fill="url(#tsRuns)" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="cost" stroke="hsl(170 90% 55%)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Generic compact sparkline-ish area for any daily metric.
export function DailyArea({ daily, field, color = "hsl(145 95% 50%)" }: {
  daily: Analytics["daily"]; field: "avg_latency" | "tokens" | "cost"; color?: string;
}) {
  const data = daily.map((d) => ({ day: d.date.slice(5), v: d[field] }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={`da-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={{ background: "hsl(152 12% 5%)", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#da-${field})`} name={field} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
