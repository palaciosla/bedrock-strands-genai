import { MessageDetails, SessionMetrics } from "./types";

export type ChatApiResponse = {
  response: string;
  session_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  avg_latency_ms: number;
  request_count: number;
  tools_used: string[];
};

export type NormalizedChatMetrics = {
  messageDetails: MessageDetails;
  sessionMetrics: SessionMetrics;
};

export function normalizedMessageDetails(
  apiResponse: ChatApiResponse,
): MessageDetails {
  const toolsUsed = apiResponse.tools_used;

  return {
    tools: toolsUsed.length > 0 ? toolsUsed : undefined,
    latencyMs: apiResponse.latency_ms,
    inputTokens: apiResponse.input_tokens,
    outputTokens: apiResponse.output_tokens,
  };
}

export function normalizedSessionMetrics(
  apiResponse: ChatApiResponse,
  previous: SessionMetrics,
): SessionMetrics {
  const toolsUsed = apiResponse.tools_used;
  const recentTools = [...toolsUsed, ...previous.recentTools].slice(0, 6);

  return {
    requestCount: apiResponse.request_count,
    totalTokens: previous.totalTokens + apiResponse.total_tokens,
    inputTokens: previous.inputTokens + apiResponse.input_tokens,
    outputTokens: previous.outputTokens + apiResponse.output_tokens,
    avgLatencyMs: apiResponse.avg_latency_ms,
    lastTool: toolsUsed[0] ?? previous.lastTool,
    recentTools: [...new Set(recentTools)],
  };
}

export function normalizedMetrics(
  apiResponse: ChatApiResponse,
  previous: SessionMetrics,
): NormalizedChatMetrics {
  return {
    messageDetails: normalizedMessageDetails(apiResponse),
    sessionMetrics: normalizedSessionMetrics(apiResponse, previous),
  };
}
