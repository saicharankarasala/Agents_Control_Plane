import { FileText } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { items } = await api.audit();

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable, append-only record for compliance review"
        action={
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/v1/audit-logs?export=csv`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            Export CSV
          </a>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title="No audit events yet" />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{a.actor_type}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {a.resource_type}/{a.resource_id?.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{relTime(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
