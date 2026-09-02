"use client";

import { BackstageTab } from "../../lib/types";
import { useI18n } from "../../i18n/I18nProvider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_ORDER: BackstageTab[] = [
  "sql",
  "metrics",
  "prompt",
  "observability",
  "guards",
  "eval",
];

export function BackstageTabs({
  active,
  onChange,
}: {
  active: BackstageTab;
  onChange: (tab: BackstageTab) => void;
}) {
  const { t } = useI18n();

  const labels: Record<BackstageTab, string> = {
    sql: t.tabs.sql,
    metrics: t.tabs.metrics,
    prompt: t.tabs.prompt,
    observability: t.tabs.observability,
    guards: t.tabs.guards,
    eval: t.tabs.eval,
  };

  return (
    <Tabs
      value={active}
      onValueChange={(value) => onChange(value as BackstageTab)}
      className="overflow-hidden border-b border-white/10 px-6"
    >
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-5 overflow-hidden rounded-none bg-transparent p-0"
      >
        {TAB_ORDER.map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="shrink-0 rounded-none border-b-2 border-transparent px-0 pb-3 pt-4 text-sm font-semibold text-white/45 shadow-none transition-colors after:hidden hover:text-white/75 data-active:border-[var(--tab-active)] data-active:bg-transparent data-active:text-[var(--wise-green)]"
          >
            {labels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
