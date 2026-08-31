"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { BackstageTab, SessionMetrics } from "../../lib/types";
import { useI18n } from "../../i18n/I18nProvider";
import { BackstageContent } from "./BackstageContent";
import { BackstageTabs } from "./BackstageTabs";
import { Badge } from "@/components/ui/badge";

export function BackstagePanel({
  metrics,
  sessionId,
}: {
  metrics: SessionMetrics;
  sessionId: string;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<BackstageTab>("sql");

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
              {t.brand.liveOs}
            </p>
            <h2 className="mt-1 text-3xl font-black leading-[0.95] tracking-tight">
              {t.brand.cornerTitle}
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-white/45">
              {t.brand.cornerSubtitle}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <Badge className="gap-2 rounded-full border-0 bg-[var(--wise-mint)] font-semibold text-[var(--wise-dark-green)] hover:bg-[var(--wise-mint)]">
              <Activity className="size-3" aria-hidden />
              {t.brand.backstage}
            </Badge>
          </div>
        </div>
      </header>

      <BackstageTabs active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <BackstageContent activeTab={activeTab} metrics={metrics} sessionId={sessionId} />
      </div>
    </div>
  );
}
