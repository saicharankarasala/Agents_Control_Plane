import { Copy, KeyRound } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="API keys, members, and organization" />

      <Card className="mb-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <KeyRound size={16} /> API Keys
          </h2>
          <button className="rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-sm font-medium text-white">
            Create key
          </button>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
          <div>
            <div className="font-mono text-sm">acp_live_demo••••••••••</div>
            <div className="text-xs text-muted-foreground">Default key · used for SDK ingest</div>
          </div>
          <button className="text-muted-foreground hover:text-foreground"><Copy size={15} /></button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-medium">Organization</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>Demo Org</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Plan</dt><dd>Team</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Auth</dt><dd>Clerk (Organizations)</dd></div>
        </dl>
      </Card>
    </div>
  );
}
