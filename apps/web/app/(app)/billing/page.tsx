import { Check } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Community", price: "$0", blurb: "Up to 10,000 traces/month", features: ["Tracing & waterfall", "Basic evals", "1 project"], cta: "Current plan", current: true },
  { name: "Pro", price: "$49", blurb: "For solo developers", features: ["100k traces", "LLM-as-judge", "All eval types", "Policy engine"], cta: "Upgrade" },
  { name: "Team", price: "$199", blurb: "Shared dashboards & evals", features: ["1M traces", "Approval queue", "Audit logs", "RBAC"], cta: "Upgrade", featured: true },
  { name: "Enterprise", price: "Custom", blurb: "On-prem, SLA, SSO", features: ["Unlimited", "On-prem / Helm", "Custom policies", "SAML/SCIM"], cta: "Contact us" },
];

export default function BillingPage() {
  return (
    <div>
      <PageHeader title="Billing" subtitle="Subscription & usage (Stripe test mode)" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <Card key={t.name} className={cn("flex flex-col p-5", t.featured && "ring-1 ring-[hsl(var(--primary))]")}>
            <h3 className="text-sm font-medium">{t.name}</h3>
            <div className="mt-2 text-3xl font-semibold">
              {t.price}<span className="text-sm font-normal text-muted-foreground">{t.price !== "Custom" && "/mo"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
            <button
              className={cn(
                "mt-5 rounded-md px-3 py-2 text-sm font-medium",
                t.current ? "border border-border text-muted-foreground" : "bg-[hsl(var(--primary))] text-white",
              )}
              disabled={t.current}
            >
              {t.cta}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
