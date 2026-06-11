"use client";

import { ShieldAlert, ShieldCheck, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarList, ViolationsByType } from "@/components/analytics";
import { Card, MiniStat, Panel, SeverityBadge, StatusBadge } from "@/components/ui";
import { api, type Violation } from "@/lib/api";
import { relTime } from "@/lib/utils";

function describe(d: Record<string, unknown>): string {
  if (d.detected) return `PII: ${(d.detected as string[]).join(", ")}`;
  if (d.tool) return `High-risk tool: ${d.tool}`;
  return "policy";
}

export default function PoliciesPage() {
  const [items, setItems] = useState<Violation[]>([]);

  useEffect(() => {
    let alive = true;
    async function pull() {
      const v = await api.violations();
      if (alive) setItems(v.items);
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const open = items.filter((v) => v.status === "open").length;
  const sev = new Map<string, number>();
  for (const v of items) sev.set(v.severity, (sev.get(v.severity) ?? 0) + 1);
  const sevData = ["critical", "high", "medium", "low"].filter((s) => sev.has(s)).map((s) => ({ label: s, value: sev.get(s)! }));
  const pii = items.filter((v) => (v.details as Record<string, unknown>).detected).length;
  const risk = items.filter((v) => (v.details as Record<string, unknown>).tool).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Policy Violation Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} violations · PII, unsafe tools, high-risk actions</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Total" value={String(items.length)} />
        <MiniStat label="Open" value={String(open)} tone={open ? "warn" : "good"} />
        <MiniStat label="PII Exposures" value={String(pii)} tone={pii ? "danger" : "good"} />
        <MiniStat label="High-risk Actions" value={String(risk)} tone={risk ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel icon={<ShieldAlert size={15} className="text-amber-400" />} title="Violations by Type"><ViolationsByType violations={items} /></Panel>
        <Panel icon={<BarChart3 size={15} className="text-amber-400" />} title="By Severity">
          {sevData.length ? <BarList data={sevData} /> : <p className="px-4 py-8 text-center text-sm text-muted-foreground">None</p>}
        </Panel>
      </div>

      {items.length === 0 ? (
        <Card><div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck size={28} className="mb-3 text-[hsl(145_95%_50%)]" />
          <p className="font-medium">No policy violations</p>
        </div></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Violation</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Run</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 60).map((v) => (
                <tr key={v.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5"><SeverityBadge severity={v.severity} /></td>
                  <td className="px-4 py-2.5 text-xs"><span className="flex items-center gap-2"><ShieldAlert size={14} className="text-amber-400" />{describe(v.details as Record<string, unknown>)}</span></td>
                  <td className="px-4 py-2.5"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-2.5"><Link href={`/runs/${v.run_id}`} className="font-mono text-[11px] hover:text-[hsl(145_95%_60%)]">{v.run_id.slice(0, 8)}</Link></td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">{relTime(v.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
