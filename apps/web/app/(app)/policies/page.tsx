import { ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function describe(details: Record<string, unknown>): string {
  if (details.detected) return `PII detected: ${(details.detected as string[]).join(", ")}`;
  if (details.tool) return `High-risk tool: ${details.tool}`;
  return JSON.stringify(details);
}

export default async function PoliciesPage() {
  const { items } = await api.violations();

  return (
    <div>
      <PageHeader
        title="Policy Violation Center"
        subtitle={`${items.length} violations · PII, unsafe tools, high-risk actions`}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title="No policy violations"
          hint="The governance engine scans every run for PII exposure, unsafe tool calls, and high-risk actions."
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Violation</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Run</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3"><SeverityBadge severity={v.severity} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={15} className="text-amber-500" />
                      {describe(v.details)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/runs/${v.run_id}`} className="font-mono text-xs hover:underline">
                      {v.run_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{relTime(v.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
