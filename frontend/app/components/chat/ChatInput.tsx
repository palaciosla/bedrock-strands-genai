"use client";

import { FormEvent, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "../../i18n/I18nProvider";
import { TestsMenu } from "./TestsMenu";

export function ChatInput({
  onSend,
  isLoading,
}: {
  onSend: (message: string) => void;
  isLoading: boolean;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="border-t border-border bg-background px-6 py-4">
      <form
        onSubmit={handleSubmit}
        className="wise-ring flex items-center gap-2 rounded-full bg-card p-1.5 pl-4"
      >
        <Input
          type="text"
          value={input}
          disabled={isLoading}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t.chat.placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
        />
        <TestsMenu onSelect={onSend} disabled={isLoading} />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label={t.chat.send}
          className="wise-interactive size-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
        </Button>
      </form>
      <p className="mt-3 text-center text-[11px] font-medium text-muted-foreground">
        {t.chat.disclaimer}
      </p>
    </div>
  );
}
