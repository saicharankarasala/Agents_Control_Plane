"use client";

// Scrolling stat ticker, Bloomberg-style. Pauses on hover.
export function Ticker({ items }: { items: { label: string; value: string; tone?: "up" | "down" | "neutral" }[] }) {
  const toneColor = { up: "text-[hsl(145_95%_55%)]", down: "text-red-400", neutral: "text-foreground" };
  const row = (key: string) => (
    <span key={key} className="inline-flex items-center">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</span>
          <span className={`font-mono text-sm font-semibold tabular ${toneColor[it.tone ?? "neutral"]}`}>
            {it.value}
          </span>
          {it.tone === "up" && <span className="text-[hsl(145_95%_55%)]">▲</span>}
          {it.tone === "down" && <span className="text-red-400">▼</span>}
          <span className="ml-3 text-border">|</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className="marquee-wrap overflow-hidden rounded-lg border border-border bg-card/60">
      <div className="marquee-track py-2">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
