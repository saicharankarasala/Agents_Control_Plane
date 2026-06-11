"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Span } from "@/lib/api";
import { cn, fmtCost, fmtMs } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  llm: "bg-indigo-500",
  tool: "bg-amber-500",
  retrieval: "bg-cyan-500",
  chain: "bg-violet-500",
  guardrail: "bg-rose-500",
};

export function TraceWaterfall({ spans }: { spans: Span[] }) {
  const total = Math.max(
    1,
    ...spans.map((s) => s.offset_ms + Math.max(s.latency_ms, 1)),
  );

  return (
    <div className="divide-y divide-border">
      {spans.map((s) => (
        <SpanRow key={s.id} span={s} total={total} />
      ))}
    </div>
  );
}

function SpanRow({ span, total }: { span: Span; total: number }) {
  const [open, setOpen] = useState(false);
  const left = (span.offset_ms / total) * 100;
  const width = Math.max((span.latency_ms / total) * 100, 1.5);
  const color = TYPE_COLORS[span.type] ?? "bg-slate-500";

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent/40"
      >
        <span className="text-muted-foreground">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} />
        <span className="w-44 shrink-0 truncate font-mono text-xs">
          {span.tool_name ?? span.name}
        </span>
        <span className="w-16 shrink-0 text-[10px] uppercase text-muted-foreground">
          {span.type}
        </span>
        <div className="relative h-4 flex-1 rounded bg-muted">
          <div
            className={cn("absolute top-0 h-4 rounded opacity-80", color)}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </div>
        <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {fmtMs(span.latency_ms)}
        </span>
        {span.status === "error" && (
          <span className="text-xs text-red-500">error</span>
        )}
      </button>

      {open && (
        <div className="space-y-2 bg-muted/30 px-10 py-3 font-mono text-xs">
          <Row label="tokens" value={String(span.tokens)} />
          <Row label="cost" value={fmtCost(span.cost_usd)} />
          {span.tool_input != null && (
            <Json label="tool_input" value={span.tool_input} />
          )}
          {span.tool_output != null && (
            <Json label="tool_output" value={span.tool_output} />
          )}
          {span.output != null && <Json label="output" value={span.output} />}
          {span.error && (
            <div className="text-red-500">error: {span.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <pre className="mt-1 overflow-x-auto rounded bg-background p-2">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
