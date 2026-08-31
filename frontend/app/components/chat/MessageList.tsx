"use client";

import { Loader2, PawPrint, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useI18n } from "../../i18n/I18nProvider";
import { ChatMessage, MessageDetails } from "../../lib/types";

function AgentAvatar() {
  return (
    <Avatar className="size-9 shrink-0 rounded-full wise-ring">
      <AvatarFallback className="rounded-full bg-[var(--wise-mint)] text-[var(--wise-dark-green)]">
        <PawPrint className="size-4" strokeWidth={2.5} aria-hidden />
      </AvatarFallback>
    </Avatar>
  );
}

function UserAvatar() {
  return (
    <Avatar className="size-9 shrink-0 rounded-full bg-[var(--panel-bg)] wise-ring">
      <AvatarFallback className="rounded-full bg-[var(--panel-bg)] text-white">
        <User className="size-4" strokeWidth={2} aria-hidden />
      </AvatarFallback>
    </Avatar>
  );
}

function MessageMeta({
  details,
  role,
}: {
  details?: MessageDetails;
  role: ChatMessage["role"];
}) {
  const { t } = useI18n();

  if (!details) return null;

  const items: { label: string; value: string }[] = [];

  if (details.tools && details.tools.length > 0) {
    items.push({
      label: t.chat.detailsTools,
      value: details.tools.join(", "),
    });
  }
  if (details.inputTokens !== undefined) {
    items.push({
      label: t.chat.detailsInputTokens,
      value: details.inputTokens.toString(),
    });
  }
  if (details.outputTokens !== undefined) {
    items.push({
      label: t.chat.detailsOutputTokens,
      value: details.outputTokens.toString(),
    });
  }
  if (details.latencyMs !== undefined) {
    items.push({
      label: t.chat.detailsLatency,
      value: `${details.latencyMs}ms`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2 text-[10px] font-medium leading-4",
        role === "user"
          ? "border-white/15 text-white/55"
          : "border-foreground/10 text-muted-foreground",
      )}
    >
      {items.map((item) => (
        <span key={item.label}>
          <span
            className={cn(
              "font-semibold",
              role === "user" ? "text-white/75" : "text-foreground/70",
            )}
          >
            {item.label}:
          </span>{" "}
          {item.value}
        </span>
      ))}
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
}) {
  const { t } = useI18n();

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-5 px-6 py-6">
        {messages.length === 0 && (
          <Card className="wise-card border-0 bg-card shadow-none">
            <CardContent className="pt-6">
              <Badge className="mb-3 rounded-full border-0 bg-[var(--wise-mint)] font-semibold text-[var(--wise-dark-green)] hover:bg-[var(--wise-mint)]">
                {t.brand.restaurant}
              </Badge>
              <h2 className="text-2xl font-black leading-[0.95] tracking-tight text-foreground">
                {t.chat.welcomeTitle}
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
                {t.chat.welcomeBody}
              </p>
            </CardContent>
          </Card>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role === "assistant" && <AgentAvatar />}
            <div
              className={cn(
                "max-w-[85%] px-4 py-3 text-sm font-medium leading-6",
                message.role === "user"
                  ? "rounded-[1.875rem] rounded-br-md bg-[var(--panel-bg)] text-white"
                  : "wise-ring rounded-[1.875rem] rounded-bl-md bg-[var(--agent-bubble)] text-foreground",
              )}
            >
              {message.content}
              <MessageMeta details={message.details} role={message.role} />
            </div>
            {message.role === "user" && <UserAvatar />}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 pl-12 text-muted-foreground">
            <Loader2
              className="size-4 animate-spin text-[var(--wise-dark-green)] motion-reduce:animate-none"
              aria-hidden
            />
            <span className="text-sm font-semibold">{t.chat.thinking}</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
