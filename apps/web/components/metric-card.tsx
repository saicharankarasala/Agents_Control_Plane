import { Card } from "./ui";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneColor = {
    default: "text-foreground",
    warn: "text-amber-500",
    danger: "text-red-500",
    good: "text-emerald-500",
  }[tone];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${toneColor}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
