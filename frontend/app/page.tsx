"use client";

import { useCallback, useMemo, useState } from "react";
import { BackstagePanel } from "./components/backstage/BackstagePanel";
import { ChatPanel } from "./components/chat/ChatPanel";
import { SplitLayout } from "./components/layout/SplitLayout";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import {
  normalizedMessageDetails,
  normalizedSessionMetrics,
  type ChatApiResponse,
} from "./lib/metrics";
import { getSessionId } from "./lib/session";
import { ChatMessage, SessionMetrics, createMessage } from "./lib/types";

const INITIAL_METRICS: SessionMetrics = {
  requestCount: 0,
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  avgLatencyMs: 0,
  recentTools: [],
};

function HomeContent() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<SessionMetrics>(INITIAL_METRICS);
  const sessionId = useMemo(() => getSessionId(), []);

  const onSend = useCallback(
    async (message: string) => {
      const userMessage = createMessage("user", message);
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data: ChatApiResponse = await response.json();
        const messageDetails = normalizedMessageDetails(data);

        setMessages((prev) => {
          const updated = [...prev];
          const lastUserIndex = updated.findLastIndex(
            (entry) => entry.role === "user",
          );

          if (lastUserIndex >= 0) {
            updated[lastUserIndex] = {
              ...updated[lastUserIndex],
              details: {
                inputTokens: data.input_tokens,
                guardrailIntervened: Boolean(data.guardrail_intervened),
              },
            };
          }

          return [
            ...updated,
            createMessage("assistant", data.response, messageDetails),
          ];
        });
        setMetrics((prev) => normalizedSessionMetrics(data, prev));
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", t.chat.errorMessage),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, t.chat.errorMessage],
  );

  return (
    <SplitLayout
      chat={
        <ChatPanel messages={messages} isLoading={isLoading} onSend={onSend} />
      }
      backstage={<BackstagePanel metrics={metrics} sessionId={sessionId} />}
    />
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <HomeContent />
    </I18nProvider>
  );
}
