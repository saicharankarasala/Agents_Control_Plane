// Thin client for the Agent Control Plane API.
// All calls fail soft: on error they return an empty shape so the dashboard
// renders polished empty states instead of crashing (useful before the
// backend is deployed).

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function post<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface Overview {
  total_runs: number;
  error_rate: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  open_violations: number;
  awaiting_approval: number;
}

export interface RunRow {
  id: string;
  agent: string | null;
  status: string;
  user_input: string | null;
  final_output: string | null;
  model: string | null;
  total_latency_ms: number;
  total_tokens: number;
  total_cost_usd: number;
  created_at: string | null;
}

export interface Span {
  id: string;
  type: string;
  name: string;
  status: string;
  tool_name: string | null;
  tool_input: unknown;
  tool_output: unknown;
  input: unknown;
  output: unknown;
  error: string | null;
  latency_ms: number;
  tokens: number;
  cost_usd: number;
  sequence: number;
  offset_ms: number;
}

export interface RunDetail extends RunRow {
  spans: Span[];
}

export interface Approval {
  id: string;
  run_id: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  risk_reason: string | null;
  status: string;
  requested_at: string | null;
}

export interface Violation {
  id: string;
  run_id: string;
  policy_id: string;
  severity: string;
  details: Record<string, unknown>;
  status: string;
  created_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  after: Record<string, unknown> | null;
  created_at: string | null;
}

export const api = {
  overview: () =>
    get<Overview>("/v1/overview", {
      total_runs: 0, error_rate: 0, total_cost_usd: 0,
      avg_latency_ms: 0, open_violations: 0, awaiting_approval: 0,
    }),
  runs: (params = "") =>
    get<{ items: RunRow[] }>(`/v1/runs${params}`, { items: [] }),
  run: (id: string) => get<RunDetail | null>(`/v1/runs/${id}`, null),
  approvals: (status = "pending") =>
    get<{ items: Approval[] }>(`/v1/approvals?status=${status}`, { items: [] }),
  approve: (id: string, reason?: string) =>
    post(`/v1/approvals/${id}/approve`, { reason }),
  reject: (id: string, reason?: string) =>
    post(`/v1/approvals/${id}/reject`, { reason }),
  violations: (status = "") =>
    get<{ items: Violation[] }>(
      `/v1/policy-violations${status ? `?status=${status}` : ""}`,
      { items: [] },
    ),
  audit: () => get<{ items: AuditLog[] }>("/v1/audit-logs", { items: [] }),
};
