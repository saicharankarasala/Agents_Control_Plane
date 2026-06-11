import { ChevronDown, Search } from "lucide-react";
import { ThemeToggle } from "./theme";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
        <Search size={15} />
        <span>Search runs, agents, policies…</span>
        <kbd className="ml-2 rounded bg-muted px-1.5 text-[10px]">⌘K</kbd>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Demo Org
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
        <ThemeToggle />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-semibold text-white">
          SC
        </div>
      </div>
    </header>
  );
}
