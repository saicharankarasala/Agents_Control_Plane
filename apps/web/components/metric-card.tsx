import { AnimatedNumber } from "./animated-number";
import { Sparkline } from "./sparkline";

const TONES = {
  default: { text: "text-foreground", glow: "hsl(145 95% 50%)" },
  good: { text: "text-[hsl(145_95%_55%)]", glow: "hsl(145 95% 50%)" },
  warn: { text: "text-amber-400", glow: "hsl(38 95% 55%)" },
  danger: { text: "text-red-400", glow: "hsl(0 90% 62%)" },
  info: { text: "text-cyan-300", glow: "hsl(170 90% 50%)" },
} as const;

export function MetricCard({
  label,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  hint,
  icon,
  tone = "default",
  spark,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: keyof typeof TONES;
  spark?: number[];
}) {
  const t = TONES[tone];
  return (
    <div className="glass glow-hover relative overflow-hidden rounded-xl border border-border p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span style={{ color: t.glow }} className="opacity-80">{icon}</span>
      </div>

      <div className={`mt-3 font-mono text-[2rem] font-semibold leading-none ${t.text}`}>
        <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-xs text-muted-foreground">{hint}</span>
        {spark && <Sparkline data={spark} color={t.glow} width={96} height={30} />}
      </div>
    </div>
  );
}
