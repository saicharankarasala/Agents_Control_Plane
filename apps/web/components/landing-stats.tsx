"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "./animated-number";
import { api, type Analytics } from "@/lib/api";

export function LandingStats() {
  const [a, setA] = useState<Analytics | null>(null);
  useEffect(() => { api.analytics(14).then(setA); }, []);

  const stats = [
    { label: "Agent runs traced", value: a?.totals.runs ?? 0 },
    { label: "Agents monitored", value: a?.by_agent.filter((x) => x.agent !== "unknown").length ?? 0 },
    { label: "Tokens accounted", value: a?.totals.tokens ?? 0 },
    { label: "Policy violations caught", value: a?.by_status ? (a.totals.failed ?? 0) : 0 },
  ];

  return (
    <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-[hsl(152_12%_5%)] px-6 py-5 text-center">
          <div className="font-mono text-2xl font-semibold text-[hsl(145_95%_55%)] md:text-3xl">
            <AnimatedNumber value={s.value} />
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
