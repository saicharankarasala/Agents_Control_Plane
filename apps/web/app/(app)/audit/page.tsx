"use client";

import { FileText, BarChart3, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { BarList } from "@/components/analytics";
import { API_URL, api, type AuditLog } from "@/lib/api";
import { Card, EmptyState, MiniStat, Panel } from "@/components/ui";
import { relTime } from "@/lib/utils";

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);

  useEffect(() => {
    let alive = true;
    async function pull() { const a = await api.audit(); if (alive) setItems(a.items); }
    pull();
    const iv = setInterval(pull, 6000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const byAction = new Map<string, number>();
  const byActor = new Map<string, number>();
  for (const a of items) {
    byAction.set(a.action, (byAction.get(a.action) ?? 0) + 1);
    byActor.set(a.actor_type, (byActor.get(a.actor_type) ?? 0) + 1);
  }
  const actionData = [...byAction.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const actorData = [...byActor.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Immutable, append-only record for compliance review</p>
        </div>
        <a href={`${API_URL}/v1/audit-logs?export=csv`} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Export CSV</a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Total Events" value={String(items.length)} />
        <MiniStat label="Action Types" value={String(byAction.size)} />
        <MiniStat label="Actors" value={String(byActor.size)} />
        <MiniStat label="System Events" value={String(byActor.get("system") ?? 0)} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel icon={<BarChart3 size={15} className="text-[hsl(145_95%_50%)]" />} title="Events by Action">
          {actionData.length ? <BarList data={actionData} /> : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No events</p>}
        </Panel>
        <Panel icon={<Activity size={15} className="text-[hsl(145_95%_50%)]" />} title="Events by Actor">
          {actorData.length ? <BarList data={actorData} /> : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No events</p>}
        </Panel>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title="No audit events yet" />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{a.actor_type}</span></td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">{a.action}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{a.resource_type}/{a.resource_id?.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">{relTime(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
