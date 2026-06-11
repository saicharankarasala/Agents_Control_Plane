import { ArrowLeft, Clock, Cpu, Layers, Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList } from "@/components/analytics";
import { TraceWaterfall } from "@/components/trace-waterfall";
import { Card, MiniStat, Panel, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<string, string> = {
  llm: "hsl(145 95% 50%)", tool: "hsl(38 95% 55%)", retrieval: "hsl(170 90% 50%)",
  chain: "hsl(265 85% 65%)", guardrail: "hsl(0 85% 62%)",
};

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const run = await api.run(params.id);
  if (!run) notFound();

  const spans = run.spans;
  // time + counts by span type
  const timeByType = new Map<string, number>();
  const countByType = new Map<string, number>();
  let llmTokens = 0;
  for (const s of spans) {
    timeByType.set(s.type, (timeByType.get(s.type) ?? 0) + s.latency_ms);
    countByType.set(s.type, (countByType.get(s.type) ?? 0) + 1);
    if (s.type === "llm") llmTokens += s.tokens;
  }
  const timeData = [...timeByType.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const toolCalls = countByType.get("tool") ?? 0;
  const critical = spans.filter((s) => s.status === "error").length;

  return (
    <div className="space-y-4">
      <Link href="/runs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> Back to runs
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{run.agent}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{run.id} · {run.model}</p>
        </div>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Latency" value={fmtMs(run.total_latency_ms)} tone="info" />
        <MiniStat label="Tokens" value={fmtNum(run.total_tokens)} />
        <MiniStat label="Cost" value={fmtCost(run.total_cost_usd)} />
        <MiniStat label="Spans" value={String(spans.length)} />
        <MiniStat label="Tool Calls" value={String(toolCalls)} tone={toolCalls ? "warn" : "default"} />
        <MiniStat label="Errors" value={String(critical)} tone={critical ? "danger" : "good"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground"><Zap size={13} className="text-[hsl(145_95%_50%)]" /> Input</h3>
          <p className="text-sm">{run.user_input ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground"><Zap size={13} className="text-[hsl(145_95%_50%)]" /> Final Output</h3>
          <p className="text-sm">{run.final_output ?? "—"}</p>
        </Card>
      </div>

      {/* span analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={<Clock size={15} className="text-[hsl(145_95%_50%)]" />} title="Time by Span Type">
          {timeData.length ? <BarList data={timeData} fmt={fmtMs} /> : <p className="px-4 py-6 text-center text-sm text-muted-foreground">No spans</p>}
        </Panel>
        <Panel icon={<Layers size={15} className="text-[hsl(145_95%_50%)]" />} title="Span Composition">
          <div className="space-y-2 p-4">
            {[...countByType.entries()].map(([type, n]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TYPE_COLOR[type] ?? "#666" }} />
                  <span className="capitalize">{type}</span>
                </span>
                <span className="font-mono text-muted-foreground tabular">{n}</span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground"><Cpu size={13} /> LLM tokens</span>
              <span className="font-mono tabular">{fmtNum(llmTokens)}</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel icon={<Zap size={15} className="text-[hsl(145_95%_50%)]" />} title="Trace Waterfall"
        right={<span className="text-xs text-muted-foreground">{spans.length} spans · click to expand</span>}>
        {spans.length > 0 ? <TraceWaterfall spans={spans} />
          : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No spans recorded.</p>}
      </Panel>
    </div>
  );
}
