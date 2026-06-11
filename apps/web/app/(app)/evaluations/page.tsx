import { ListChecks } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";

export default function EvaluationsPage() {
  return (
    <div>
      <PageHeader title="Evaluations" subtitle="Suites: exact match, JSON schema, forbidden tools, LLM-as-judge" />
      <EmptyState
        icon={<ListChecks size={28} />}
        title="No evaluation suites yet"
        hint="Define expected outputs, forbidden tools, JSON schemas, or an LLM-as-judge rubric. Results stream in per run."
      />
    </div>
  );
}
