import { GitCompare } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";

export default function ComparePage() {
  return (
    <div>
      <PageHeader title="Compare Agents" subtitle="Side-by-side latency, cost, error rate, and eval pass-rate" />
      <EmptyState
        icon={<GitCompare size={28} />}
        title="Select two agents to compare"
        hint="Benchmark agent versions against each other across quality and cost metrics."
      />
    </div>
  );
}
