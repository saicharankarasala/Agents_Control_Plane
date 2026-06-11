import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TraceWaterfall } from "@/components/trace-waterfall";
import { Card, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const run = await api.run(params.id);
  if (!run) notFound();

  return (
    <div>
      <Link href="/runs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> Back to runs
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{run.agent}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{run.id}</p>
        </div>
        <div className="flex gap-6 text-right text-sm">
          <Stat label="Latency" value={fmtMs(run.total_latency_ms)} />
          <Stat label="Tokens" value={fmtNum(run.total_tokens)} />
          <Stat label="Cost" value={fmtCost(run.total_cost_usd)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Input</h3>
          <p className="text-sm">{run.user_input ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Final Output</h3>
          <p className="text-sm">{run.final_output ?? "—"}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium">Trace Waterfall</h3>
          <p className="text-xs text-muted-foreground">{run.spans.length} spans · click a row to expand</p>
        </div>
        {run.spans.length > 0 ? (
          <TraceWaterfall spans={run.spans} />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No spans recorded.</p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-medium">{value}</div>
    </div>
  );
}
