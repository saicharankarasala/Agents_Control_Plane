"use client";

import {
  Activity, AlertTriangle, ClipboardCheck, FileText, GitCompare,
  LayoutDashboard, ListChecks, Settings, ShieldAlert, CreditCard, HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/health", label: "Agent Health", icon: HeartPulse },
  { href: "/runs", label: "Agent Runs", icon: Activity },
  { href: "/evaluations", label: "Evaluations", icon: ListChecks },
  { href: "/policies", label: "Policy Center", icon: ShieldAlert },
  { href: "/approvals", label: "Approval Queue", icon: ClipboardCheck },
  { href: "/audit", label: "Audit Log", icon: FileText },
  { href: "/compare", label: "Compare Agents", icon: GitCompare },
];

const NAV_BOTTOM = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  function item({ href, label, icon: Icon }: (typeof NAV)[number]) {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
          active
            ? "bg-[hsl(var(--primary)/0.12)] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary))]" />
        )}
        <Icon size={17} className={active ? "text-[hsl(var(--primary))]" : ""} />
        {label}
      </Link>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/40 p-3">
      <Link href="/" className="mb-6 flex items-center gap-2 rounded-md px-2 pt-2 pb-1 transition-colors hover:bg-accent/40" title="Back to home">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-black">
          <AlertTriangle size={16} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Agent Control</div>
          <div className="text-[11px] text-muted-foreground">Plane · home</div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">{NAV.map(item)}</nav>
      <nav className="flex flex-col gap-1 border-t border-border pt-3">{NAV_BOTTOM.map(item)}</nav>
    </aside>
  );
}
