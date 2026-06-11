// Catalog of agent purposes/domains — used to explain what each agent does.
export interface AgentInfo { purpose: string; domain: string }

export const AGENT_CATALOG: Record<string, AgentInfo> = {
  // banking / fintech
  "refund-agent": { purpose: "Processes customer refund requests and issues reimbursements.", domain: "Banking" },
  "dispute-agent": { purpose: "Investigates and resolves card transaction disputes.", domain: "Banking" },
  "fraud-triage": { purpose: "Triages suspected fraudulent transactions for analyst review.", domain: "Banking" },
  "kyc-agent": { purpose: "Runs Know-Your-Customer identity verification on new accounts.", domain: "Banking" },
  "aml-screening": { purpose: "Screens transactions against anti-money-laundering watchlists.", domain: "Banking" },
  "credit-underwriter": { purpose: "Assesses creditworthiness for loan and card applications.", domain: "Banking" },
  "wire-transfer-agent": { purpose: "Validates and initiates outbound wire transfers (high-risk).", domain: "Banking" },
  "statement-assistant": { purpose: "Answers customer questions about account statements.", domain: "Banking" },
  "card-services": { purpose: "Handles card activation, freezing, and replacement.", domain: "Banking" },
  "collections-agent": { purpose: "Manages outreach on overdue accounts.", domain: "Banking" },
  // healthcare / payer
  "claims-processor": { purpose: "Adjudicates inbound insurance claims against policy rules.", domain: "Healthcare" },
  "prior-auth-agent": { purpose: "Evaluates prior-authorization requests for procedures.", domain: "Healthcare" },
  "eligibility-checker": { purpose: "Verifies member benefit eligibility in real time.", domain: "Healthcare" },
  "denial-appeals": { purpose: "Drafts and reviews claim-denial appeals.", domain: "Healthcare" },
  "coding-assistant": { purpose: "Suggests ICD/CPT medical billing codes.", domain: "Healthcare" },
  "care-navigator": { purpose: "Routes members to appropriate care pathways.", domain: "Healthcare" },
  // insurance
  "policy-quote-agent": { purpose: "Generates insurance policy quotes from applicant data.", domain: "Insurance" },
  "claims-fnol": { purpose: "Captures first-notice-of-loss claim intake.", domain: "Insurance" },
  "underwriting-risk": { purpose: "Scores underwriting risk for new policies.", domain: "Insurance" },
  "renewal-agent": { purpose: "Handles policy renewals and re-rating.", domain: "Insurance" },
  // support / saas
  "support-tier1": { purpose: "First-line customer support triage and resolution.", domain: "Support" },
  "support-escalation": { purpose: "Escalates complex tickets to specialist queues.", domain: "Support" },
  "billing-assistant": { purpose: "Resolves billing, invoice, and subscription questions.", domain: "Support" },
  "onboarding-guide": { purpose: "Walks new users through product setup.", domain: "Support" },
  "churn-saver": { purpose: "Engages at-risk customers to reduce churn.", domain: "Support" },
  "knowledge-bot": { purpose: "Answers questions from the internal knowledge base (RAG).", domain: "Support" },
  // sales / marketing
  "lead-qualifier": { purpose: "Qualifies and scores inbound sales leads.", domain: "Sales" },
  "proposal-writer": { purpose: "Drafts tailored sales proposals.", domain: "Sales" },
  "crm-updater": { purpose: "Updates CRM records from customer interactions.", domain: "Sales" },
  "outreach-agent": { purpose: "Personalizes prospect outreach sequences.", domain: "Sales" },
  // legal / compliance
  "contract-reviewer": { purpose: "Reviews contracts for risky clauses and obligations.", domain: "Legal" },
  "compliance-monitor": { purpose: "Flags interactions that breach compliance policy.", domain: "Legal" },
  "policy-rag": { purpose: "Answers policy questions grounded in source documents.", domain: "Legal" },
  "redaction-agent": { purpose: "Redacts PII and sensitive data from documents.", domain: "Legal" },
  // devops / internal
  "incident-responder": { purpose: "Triages and summarizes production incidents.", domain: "DevOps" },
  "log-analyzer": { purpose: "Summarizes and diagnoses application logs.", domain: "DevOps" },
  "deploy-approver": { purpose: "Gates production deployments behind checks (high-risk).", domain: "DevOps" },
  "runbook-agent": { purpose: "Executes operational runbooks step by step.", domain: "DevOps" },
  // hr / ops
  "recruiting-screener": { purpose: "Screens candidate resumes against role criteria.", domain: "HR" },
  "hr-helpdesk": { purpose: "Answers employee HR and benefits questions.", domain: "HR" },
  "expense-auditor": { purpose: "Audits expense reports for policy violations.", domain: "Finance" },
};

const DOMAIN_COLOR: Record<string, string> = {
  Banking: "hsl(145 95% 50%)", Healthcare: "hsl(190 90% 55%)", Insurance: "hsl(265 85% 65%)",
  Support: "hsl(38 95% 55%)", Sales: "hsl(330 85% 60%)", Legal: "hsl(170 90% 50%)",
  DevOps: "hsl(15 90% 58%)", HR: "hsl(95 70% 50%)", Finance: "hsl(50 95% 55%)",
};

export function agentInfo(name: string): AgentInfo & { color: string } {
  const info = AGENT_CATALOG[name] ?? { purpose: "Custom agent instrumented with the ACP SDK.", domain: "Custom" };
  return { ...info, color: DOMAIN_COLOR[info.domain] ?? "hsl(150 6% 55%)" };
}
