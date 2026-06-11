"use client";

import {
  Activity, AlertTriangle, ClipboardCheck, FileText, GitCompare,
  LayoutDashboard, ListChecks, Settings, ShieldAlert, CreditCard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
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
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <Icon size={17} />
        {label}
      </Link>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/40 p-3">
      <div className="mb-6 flex items-center gap-2 px-2 pt-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-white">
          <AlertTriangle size={16} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Agent Control</div>
          <div className="text-[11px] text-muted-foreground">Plane</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">{NAV.map(item)}</nav>
      <nav className="flex flex-col gap-1 border-t border-border pt-3">{NAV_BOTTOM.map(item)}</nav>
    </aside>
  );
}
