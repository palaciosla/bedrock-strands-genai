export type MessageRole = "user" | "assistant";

export type GuardrailAssessment = {
  source?: string;
  action?: string;
  actionReason?: string;
  error?: string;
};

export type MessageDetails = {
  tools?: string[];
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  guardrailIntervened?: boolean;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  details?: MessageDetails;
};

export type BackstageTab = "sql" | "metrics" | "prompt" | "observability" | "guards" | "eval";

export type EvalCaseScore = {
  score: number | null;
  passed: boolean | null;
};

export type EvalModelSummary = {
  overall_score: number | null;
  pass_rate: number | null;
  run_date: string | null;
};

export type EvalComparisonRow = {
  case_name: string;
  input: string | null;
  by_model: Record<string, EvalCaseScore>;
};

export type EvalComparison = {
  eval_type: string;
  models: string[];
  rows: EvalComparisonRow[];
  model_summaries?: Record<string, EvalModelSummary>;
};

export type SessionMetrics = {
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
  lastTool?: string;
  recentTools: string[];
  lastGuardrailIntervened?: boolean;
  lastGuardrailAssessments?: GuardrailAssessment[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  dietary_tags: string[] | null;
  available: boolean;
  created_at: string;
};

export type Reservation = {
  id: string;
  guest_name: string;
  guest_email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  notes: string | null;
  session_id: string | null;
  created_at: string;
};

export function createMessage(
  role: MessageRole,
  content: string,
  details?: MessageDetails,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    details,
  };
}
