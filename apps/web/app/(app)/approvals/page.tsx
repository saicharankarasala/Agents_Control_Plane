"use client";

import { Check, ClipboardCheck, X, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { BarList } from "@/components/analytics";
import { Card, EmptyState, MiniStat, Panel } from "@/components/ui";
import { api, type Approval } from "@/lib/api";
import { relTime } from "@/lib/utils";

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await api.approvals("pending");
    setItems(res.items);
    setLoading(false);
  }
  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, []);

  async function act(id: string, decision: "approve" | "reject") {
    setBusy(id);
    if (decision === "approve") await api.approve(id, "Reviewed in dashboard");
    else await api.reject(id, "Rejected in dashboard");
    setItems((prev) => prev.filter((a) => a.id !== id));
    setBusy(null);
  }

  const byAction = new Map<string, number>();
  for (const a of items) byAction.set(a.action_type, (byAction.get(a.action_type) ?? 0) + 1);
  const actionData = [...byAction.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">High-risk agent actions paused for human review</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Pending" value={String(items.length)} tone={items.length ? "warn" : "good"} />
        <MiniStat label="Action Types" value={String(byAction.size)} />
        <MiniStat label="Oldest" value={items.length ? relTime(items[items.length - 1].requested_at) : "—"} />
        <MiniStat label="Status" value={items.length ? "Action needed" : "Clear"} tone={items.length ? "warn" : "good"} />
      </div>

      {actionData.length > 0 && (
        <Panel icon={<BarChart3 size={15} className="text-amber-400" />} title="Pending by Action Type"><BarList data={actionData} /></Panel>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={28} />} title="No pending approvals"
          hint="When an agent attempts a high-risk action (refund, send email, prod API), it pauses here for a human to approve or reject." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-400">{a.action_type}</span>
                  <span className="text-xs text-muted-foreground">{relTime(a.requested_at)}</span>
                </div>
                <p className="mt-1 text-sm">{a.risk_reason}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 font-mono text-xs text-muted-foreground">{JSON.stringify(a.action_payload, null, 2)}</pre>
              </div>
              <div className="flex shrink-0 gap-2">
                <button disabled={busy === a.id} onClick={() => act(a.id, "reject")}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"><X size={15} /> Reject</button>
                <button disabled={busy === a.id} onClick={() => act(a.id, "approve")}
                  className="flex items-center gap-1 rounded-md bg-[hsl(145_85%_38%)] px-3 py-2 text-sm font-medium text-black hover:bg-[hsl(145_85%_45%)] disabled:opacity-50"><Check size={15} /> Approve</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
