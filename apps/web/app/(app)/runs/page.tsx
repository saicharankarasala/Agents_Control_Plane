import { Activity } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum, relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const { items } = await api.runs("?limit=100");

  return (
    <div>
      <PageHeader title="Agent Runs" subtitle={`${items.length} runs`} />

      {items.length === 0 ? (
        <EmptyState
          icon={<Activity size={28} />}
          title="No runs yet"
          hint="Install the SDK and wrap your agent loop, or run `python seeds/generate_demo_data.py` to populate demo traces."
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Input</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 text-right font-medium">Latency</th>
                <th className="px-4 py-3 text-right font-medium">Tokens</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link href={`/runs/${r.id}`} className="font-medium hover:underline">
                      {r.agent ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                    {r.user_input ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.model ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtMs(r.total_latency_ms)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.total_tokens)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtCost(r.total_cost_usd)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{relTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
