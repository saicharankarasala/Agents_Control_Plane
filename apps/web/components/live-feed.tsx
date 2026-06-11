"use client";

import Link from "next/link";
import type { RunRow } from "@/lib/api";
import { StatusBadge } from "./ui";
import { fmtCost, fmtMs, relTime } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  completed: "bg-emerald-400",
  failed: "bg-red-400",
  awaiting_approval: "bg-amber-400",
  running: "bg-cyan-400",
};

export function LiveFeed({ runs, newIds }: { runs: RunRow[]; newIds: Set<string> }) {
  return (
    <div className="divide-y divide-border/60">
      {runs.slice(0, 12).map((r) => (
        <Link
          key={r.id}
          href={`/runs/${r.id}`}
          className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40 ${
            newIds.has(r.id) ? "flash-row" : ""
          }`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[r.status] ?? "bg-slate-500"}`} />
          <span className="w-32 shrink-0 truncate font-mono text-xs">{r.agent}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {r.user_input}
          </span>
          <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
            {fmtMs(r.total_latency_ms)}
          </span>
          <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground md:inline">
            {fmtCost(r.total_cost_usd)}
          </span>
          <StatusBadge status={r.status} />
          <span className="w-14 shrink-0 text-right text-[11px] text-muted-foreground">
            {relTime(r.created_at)}
          </span>
        </Link>
      ))}
    </div>
  );
}
