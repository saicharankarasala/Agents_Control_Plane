import {
  Activity, ArrowRight, ClipboardCheck, FileText, Github, GitCompare,
  ListChecks, ShieldAlert, Triangle, Zap,
} from "lucide-react";
import Link from "next/link";
import { LandingStats } from "@/components/landing-stats";

const FEATURES = [
  { icon: Activity, title: "Distributed Tracing", body: "Step-by-step span waterfalls for every agent run — LLM calls, tool calls, retrievals, latency, tokens, and cost." },
  { icon: ListChecks, title: "Evaluations", body: "Exact match, JSON schema, forbidden-tool, tool-sequence, and LLM-as-judge graded by Claude." },
  { icon: ShieldAlert, title: "Governance", body: "Detect PII exposure, unsafe tool calls, and high-risk actions with a rule-based policy engine." },
  { icon: ClipboardCheck, title: "Human-in-the-Loop", body: "Pause risky actions — refunds, wires, prod APIs — for a human to approve or reject before they run." },
  { icon: FileText, title: "Audit Logs", body: "Immutable, append-only, exportable compliance trail of every policy event and approval." },
  { icon: GitCompare, title: "Multi-Agent", body: "Compare dozens of agents across volume, latency, cost, and reliability in one view." },
];

const STACK = ["Python SDK", "FastAPI", "Next.js", "PostgreSQL", "Redis", "Qdrant", "Clerk", "Anthropic", "Docker"];

const SNIPPET = `import acp
acp.init(api_key="acp_...", project="support")

with acp.run(agent="refund-agent", user_input=q) as run:
    with run.span("llm", model="claude-sonnet-4-6") as s:
        s.set_output(resp); s.set_tokens(input=120, output=80)

    with run.tool("issue_refund", args={"amount": 500}) as t:
        run.require_approval(t)        # blocks until a human approves
        t.set_tool_output(do_refund())

    run.set_output(answer)`;

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(145_95%_45%)] text-black"><Triangle size={15} fill="black" /></span>
            <span className="font-semibold">Agent Control Plane</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com/saicharankarasala/Agents_Control_Plane" className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:flex"><Github size={16} /> GitHub</a>
            <Link href="/overview" className="flex items-center gap-1.5 rounded-md bg-[hsl(145_95%_45%)] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[hsl(145_95%_55%)]">
              Launch Dashboard <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <div className="animate-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(145_95%_45%/0.3)] bg-[hsl(145_95%_45%/0.08)] px-3 py-1 text-xs font-medium text-[hsl(145_95%_60%)]">
            <span className="live-dot" /> Open-source · Enterprise-grade · Live demo
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Mission control for your <span className="text-[hsl(145_95%_55%)] text-glow">AI agents</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Trace every run, evaluate quality, enforce governance, and gate risky actions behind human approval —
            observability and control for agents built on LangChain, LlamaIndex, or any LLM API.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/overview" className="flex items-center gap-2 rounded-lg bg-[hsl(145_95%_45%)] px-6 py-3 font-medium text-black transition-colors hover:bg-[hsl(145_95%_55%)]">
              Launch Live Demo <ArrowRight size={17} />
            </Link>
            <a href="https://github.com/saicharankarasala/Agents_Control_Plane" className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent">
              <Github size={17} /> View Source
            </a>
          </div>
        </div>
        <LandingStats />
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Everything you need to ship agents safely</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">From first trace to production governance — one control plane.</p>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glow-hover rounded-xl border border-border p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[hsl(145_95%_45%/0.12)] text-[hsl(145_95%_55%)]"><f.icon size={20} /></span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SDK */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(145_95%_55%)]"><Zap size={16} /> Python SDK</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Instrument any agent in 6 lines</h2>
            <p className="mt-4 text-muted-foreground">
              Wrap your agent loop with the open-source <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-[hsl(145_95%_60%)]">acp</code> SDK.
              It captures runs, spans, tool calls, tokens, and cost — and fails open, so it never breaks production.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {["Framework-agnostic — works with LangChain, LlamaIndex, or raw API calls", "OpenTelemetry-compatible span model", "Built-in cost accounting + approval gating"].map((x) => (
                <li key={x} className="flex items-start gap-2"><span className="mt-1 text-[hsl(145_95%_55%)]">▸</span>{x}</li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-[hsl(152_12%_4%)]">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/60" /><span className="h-3 w-3 rounded-full bg-amber-500/60" /><span className="h-3 w-3 rounded-full bg-[hsl(145_95%_45%)]/60" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">agent.py</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-foreground/90">{SNIPPET}</pre>
          </div>
        </div>
      </section>

      {/* stack */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Built with</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {STACK.map((s) => (
            <span key={s} className="rounded-full border border-border bg-card/60 px-4 py-1.5 font-mono text-xs text-muted-foreground">{s}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="glass rounded-2xl border border-[hsl(145_95%_45%/0.25)] p-12">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to take control of your agents?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Explore the live demo — real traces, evaluations, governance, and a streaming approval queue.</p>
          <Link href="/overview" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[hsl(145_95%_45%)] px-7 py-3 font-medium text-black transition-colors hover:bg-[hsl(145_95%_55%)]">
            Launch Live Demo <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>Agent Control Plane — observability & governance for AI agents.</span>
          <a href="https://github.com/saicharankarasala/Agents_Control_Plane" className="hover:text-foreground">GitHub ↗</a>
        </div>
      </footer>
    </div>
  );
}
