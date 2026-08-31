"use client";

import { ChatMessage } from "../../lib/types";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { SuggestionChips } from "./SuggestionChips";

export function ChatPanel({
  messages,
  isLoading,
  onSend,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (message: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader />
      <MessageList messages={messages} isLoading={isLoading} />
      <SuggestionChips onSelect={onSend} disabled={isLoading} />
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
