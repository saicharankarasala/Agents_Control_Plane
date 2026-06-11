"use client";

import {
  Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { RunRow } from "@/lib/api";

// Aggregate recent runs into a simple per-bucket volume chart.
export function RunsChart({ runs }: { runs: RunRow[] }) {
  const buckets: Record<string, { name: string; runs: number; failed: number }> = {};
  for (const r of runs) {
    const d = r.created_at ? new Date(r.created_at) : new Date();
    const key = `${d.getHours()}:00`;
    buckets[key] ??= { name: key, runs: 0, failed: 0 };
    buckets[key].runs += 1;
    if (r.status === "failed") buckets[key].failed += 1;
  }
  const data = Object.values(buckets).slice(-12);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No run activity yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="runs" fill="hsl(243 75% 59%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="failed" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
