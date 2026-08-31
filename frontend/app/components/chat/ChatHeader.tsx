"use client";

import { PawPrint } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "../../i18n/I18nProvider";
import { LanguageSwitcher } from "../layout/LanguageSwitcher";

export function ChatHeader() {
  const { t } = useI18n();

  return (
    <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-5">
      <Avatar className="size-12 rounded-full wise-ring">
        <AvatarFallback className="rounded-full bg-primary text-primary-foreground">
          <PawPrint className="size-5" strokeWidth={2.5} aria-hidden />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <AnimatedShinyText className="mx-0 max-w-none text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t.brand.assistantLabel} · {t.brand.restaurant}
        </AnimatedShinyText>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-black leading-[0.95] tracking-tight text-foreground">
            {t.brand.agentName}
          </h1>
          <Badge className="gap-1.5 rounded-full border-0 bg-[var(--wise-mint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--wise-dark-green)] hover:bg-[var(--wise-mint)]">
            <span
              className="size-1.5 rounded-full bg-[var(--wise-positive)]"
              aria-hidden
            />
            {t.brand.online}
          </Badge>
        </div>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
