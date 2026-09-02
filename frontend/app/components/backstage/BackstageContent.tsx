"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ShieldAlert,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BackstageTab, EvalComparison, MenuItem, Reservation, SessionMetrics } from "../../lib/types";
import { useI18n } from "../../i18n/I18nProvider";

const POLL_INTERVAL_MS = 50000;

type GuardrailConfig = {
  name?: string;
  version?: string;
  status?: string;
  contentPolicy?: {
    filters?: Array<{
      type?: string;
      inputStrength?: string;
      outputStrength?: string;
      inputAction?: string;
    }>;
  };
  topicPolicy?: {
    topics?: Array<{ name?: string; type?: string }>;
  };
  sensitiveInformationPolicy?: {
    piiEntities?: Array<{
      type?: string;
      inputAction?: string;
      outputAction?: string;
    }>;
  };
};

function BackstageCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="wise-card border-0 bg-[var(--panel-card)] text-white ring-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {title}
          </CardTitle>
          <Badge className="rounded-full border-0 bg-[var(--wise-mint)] text-[10px] font-semibold uppercase tracking-wider text-[var(--wise-dark-green)] hover:bg-[var(--wise-mint)]">
            {badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DataTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-3 font-mono text-xs text-white/35">{emptyLabel}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/40">
            {columns.map((col) => (
              <th key={col.key} className="px-2 py-2 font-semibold uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={String(row.id ?? i)}
              className="border-b border-white/5 text-white/70 transition-colors hover:bg-white/5"
            >
              {columns.map((col) => (
                <td key={col.key} className="max-w-[140px] truncate px-2 py-2">
                  {formatCell(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors ${
        active
          ? "bg-[var(--wise-mint)] text-[var(--wise-dark-green)]"
          : "bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function SqlTableAccordion({
  icon: Icon,
  name,
  description,
  tag,
  count,
  sessionScoped,
  open,
  onOpenChange,
  children,
}: {
  icon: typeof UtensilsCrossed;
  name: string;
  description: string;
  tag: string;
  count: number;
  sessionScoped?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="wise-card border-0 bg-[var(--panel-card)] text-white ring-white/10">
        <CollapsibleTrigger className="w-full cursor-pointer text-left">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--wise-mint)] text-[var(--wise-dark-green)]">
                <Icon className="size-4" strokeWidth={2.5} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-semibold text-white">{name}</p>
                    <ChevronDown
                      className={`size-4 shrink-0 text-white/40 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-white/35">
                      {t.backstage.sqlRowCount.replace("{count}", String(count))}
                    </span>
                    <Badge className="rounded-full border-0 bg-primary/20 text-[10px] font-semibold uppercase tracking-wide text-[var(--wise-green)] hover:bg-primary/20">
                      {tag}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 font-mono text-xs text-white/45">{description}</p>
                {sessionScoped && (
                  <p className="mt-1 font-mono text-[10px] text-[var(--wise-green)]/70">
                    {t.backstage.sqlSessionFilter}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MenuFilters({
  categories,
  category,
  dietary,
  availableOnly,
  onCategoryChange,
  onDietaryChange,
  onAvailableOnlyChange,
}: {
  categories: string[];
  category: string | null;
  dietary: string | null;
  availableOnly: boolean;
  onCategoryChange: (value: string | null) => void;
  onDietaryChange: (value: string | null) => void;
  onAvailableOnlyChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const dietaryOptions = ["vegetarian", "vegan", "gluten-free"];

  return (
    <div className="space-y-2.5">
      <div>
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/35">
          {t.backstage.sqlFilterCategory}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label={t.backstage.sqlFilterAll}
            active={category === null}
            onClick={() => onCategoryChange(null)}
          />
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              label={cat}
              active={category === cat}
              onClick={() => onCategoryChange(cat)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/35">
          {t.backstage.sqlFilterDietary}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label={t.backstage.sqlFilterAll}
            active={dietary === null}
            onClick={() => onDietaryChange(null)}
          />
          {dietaryOptions.map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              active={dietary === tag}
              onClick={() => onDietaryChange(tag)}
            />
          ))}
        </div>
      </div>
      <FilterChip
        label={t.backstage.sqlFilterAvailable}
        active={availableOnly}
        onClick={() => onAvailableOnlyChange(!availableOnly)}
      />
    </div>
  );
}

function SqlTab({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const [reservationsOpen, setReservationsOpen] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dietaryFilter, setDietaryFilter] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, reservationsRes] = await Promise.all([
        fetch("/api/menu"),
        fetch(`/api/reservations?sessionId=${encodeURIComponent(sessionId)}`),
      ]);

      if (!menuRes.ok || !reservationsRes.ok) {
        setError(true);
        return;
      }

      const menuData = await menuRes.json();
      const reservationsData = await reservationsRes.json();

      setMenuItems(menuData.items ?? []);
      setReservations(reservationsData.reservations ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const menuCategories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))].sort(),
    [menuItems],
  );

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (availableOnly && !item.available) return false;
      if (dietaryFilter && !(item.dietary_tags ?? []).includes(dietaryFilter)) {
        return false;
      }
      return true;
    });
  }, [menuItems, categoryFilter, dietaryFilter, availableOnly]);

  const menuColumns = [
    { key: "name", label: "name" },
    { key: "price", label: "price" },
    { key: "category", label: "category" },
    { key: "dietary_tags", label: "dietary_tags" },
    { key: "available", label: "available" },
  ];

  const reservationColumns = [
    { key: "guest_name", label: "guest_name" },
    { key: "party_size", label: "party_size" },
    { key: "reservation_date", label: "date" },
    { key: "reservation_time", label: "time" },
    { key: "status", label: "status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium leading-6 text-white/55">
          {t.backstage.sqlDescription}
        </p>
        <Badge className="shrink-0 gap-1.5 rounded-full border-0 bg-[var(--wise-mint)] text-[10px] font-semibold uppercase tracking-wider text-[var(--wise-dark-green)] hover:bg-[var(--wise-mint)]">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--wise-dark-green)]" />
          {t.backstage.sqlLive}
        </Badge>
      </div>

      {loading && (
        <p className="font-mono text-xs text-white/35">{t.backstage.sqlLoading}</p>
      )}
      {error && (
        <p className="font-mono text-xs text-red-400/80">{t.backstage.sqlError}</p>
      )}

      <SqlTableAccordion
        icon={UtensilsCrossed}
        name={t.backstage.tables.menu}
        description={t.backstage.tables.menuDescription}
        tag={t.backstage.sqlReadOnly}
        count={filteredMenuItems.length}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <MenuFilters
          categories={menuCategories}
          category={categoryFilter}
          dietary={dietaryFilter}
          availableOnly={availableOnly}
          onCategoryChange={setCategoryFilter}
          onDietaryChange={setDietaryFilter}
          onAvailableOnlyChange={setAvailableOnly}
        />
        <div className="mt-3 wise-ring rounded-xl bg-black/25 p-2 ring-white/10">
          <DataTable
            columns={menuColumns}
            rows={filteredMenuItems as unknown as Record<string, unknown>[]}
            emptyLabel={t.backstage.sqlEmpty}
          />
        </div>
      </SqlTableAccordion>

      <SqlTableAccordion
        icon={CalendarDays}
        name={t.backstage.tables.reservations}
        description={t.backstage.tables.reservationsDescription}
        tag={t.backstage.sqlReadWrite}
        count={reservations.length}
        sessionScoped
        open={reservationsOpen}
        onOpenChange={setReservationsOpen}
      >
        <div className="wise-ring rounded-xl bg-black/25 p-2 ring-white/10">
          <DataTable
            columns={reservationColumns}
            rows={reservations as unknown as Record<string, unknown>[]}
            emptyLabel={t.backstage.sqlEmpty}
          />
        </div>
      </SqlTableAccordion>
    </div>
  );
}

function MetricsTab({ metrics }: { metrics: SessionMetrics }) {
  const { t } = useI18n();

  const items = [
    { label: t.backstage.requests, value: metrics.requestCount.toString() },
    { label: t.backstage.inputTokens, value: metrics.inputTokens.toString() },
    { label: t.backstage.outputTokens, value: metrics.outputTokens.toString() },
    { label: t.backstage.totalTokens, value: metrics.totalTokens.toString() },
    {
      label: t.backstage.avgLatency,
      value: metrics.avgLatencyMs > 0 ? `${metrics.avgLatencyMs}ms` : "—",
    },
  ];

  return (
    <BackstageCard
      title={t.backstage.metricsTitle}
      badge={t.backstage.metricsBadge}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="wise-ring rounded-2xl bg-black/20 p-3 ring-white/10"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--wise-green)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </BackstageCard>
  );
}

function PromptTab() {
  const { t } = useI18n();

  return (
    <BackstageCard
      title={t.backstage.promptTitle}
      badge={t.backstage.promptBadge}
    >
      <div className="space-y-3 text-sm font-medium text-white/70">
        <p>
          <span className="text-white/45">{t.backstage.promptVersion}:</span>{" "}
          <span className="font-mono text-white">{t.backstage.promptVersionValue}</span>
        </p>
        <div className="wise-ring rounded-2xl bg-black/25 p-3 font-mono text-xs leading-6 text-white/55 ring-white/10">
          Chila · Reino Canino · Strands Agent · tools: {t.backstage.promptTools}
        </div>
        <p className="text-white/45">{t.backstage.promptNote}</p>
      </div>
    </BackstageCard>
  );
}

function ObservabilityTab({ metrics }: { metrics: SessionMetrics }) {
  const { t } = useI18n();

  return (
    <BackstageCard title={t.backstage.obsTitle} badge={t.backstage.obsBadge}>
      <div className="space-y-3 text-sm">
        <p className="font-medium text-white/45">{t.backstage.lastTool}</p>
        <p className="font-mono font-semibold text-[var(--wise-green)]">
          {metrics.lastTool ?? t.backstage.noToolYet}
        </p>
        {metrics.recentTools.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {metrics.recentTools.map((tool) => (
              <Badge
                key={tool}
                className="rounded-full border-0 bg-[var(--wise-mint)] font-mono text-xs text-[var(--wise-dark-green)] hover:bg-[var(--wise-mint)]"
              >
                {tool}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </BackstageCard>
  );
}

function GuardsTab({ metrics }: { metrics: SessionMetrics }) {
  const { t } = useI18n();
  const [config, setConfig] = useState<GuardrailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/guardrails");
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as { config: GuardrailConfig };
        if (!cancelled) setConfig(data.config);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const contentFilters =
    config?.contentPolicy?.filters?.map(
      (filter) =>
        `${filter.type} (in: ${filter.inputStrength ?? "—"}, out: ${filter.outputStrength ?? "—"}, inAction: ${filter.inputAction ?? "—"})`,
    ) ?? [];

  const deniedTopics =
    config?.topicPolicy?.topics?.map(
      (topic) => `${topic.name} — ${topic.type ?? "DENY"}`,
    ) ?? [];

  const piiEntities =
    config?.sensitiveInformationPolicy?.piiEntities?.map(
      (entity) =>
        `${entity.type} (in: ${entity.inputAction ?? "—"}, out: ${entity.outputAction ?? "—"})`,
    ) ?? [];

  const badge = config ? t.backstage.guardsBadgeConfigured : t.backstage.guardsBadge;
  const note = config
    ? t.backstage.guardsConfiguredNote
    : error
      ? t.backstage.guardsLoadError
      : loading
        ? t.backstage.guardsLoading
        : t.backstage.guardsNote;

  return (
    <BackstageCard title={t.backstage.guardsTitle} badge={badge}>
      <div className="flex items-start gap-3">
        <ShieldAlert
          className="mt-0.5 size-4 shrink-0 text-[var(--wise-green)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-6 text-white/55">{note}</p>

          {config && (
            <div className="mt-4 space-y-4 font-mono text-xs text-white/70">
              <div>
                <p className="text-white/40">{config.name}</p>
                <p className="text-white/55">
                  v{config.version} · {config.status}
                </p>
              </div>

              <div>
                <p className="mb-2 font-semibold uppercase tracking-wider text-white/40">
                  {t.backstage.guardContentFilters}
                </p>
                {contentFilters.length > 0 ? (
                  contentFilters.map((item) => <p key={item}>• {item}</p>)
                ) : (
                  <p>• {t.backstage.guardStatusNotConfigured}</p>
                )}
              </div>

              <div>
                <p className="mb-2 font-semibold uppercase tracking-wider text-white/40">
                  {t.backstage.guardDeniedTopics}
                </p>
                {deniedTopics.length > 0 ? (
                  deniedTopics.map((item) => <p key={item}>• {item}</p>)
                ) : (
                  <p>• {t.backstage.guardStatusNotConfigured}</p>
                )}
              </div>

              <div>
                <p className="mb-2 font-semibold uppercase tracking-wider text-white/40">
                  {t.backstage.guardPiiMasking}
                </p>
                {piiEntities.length > 0 ? (
                  piiEntities.map((item) => <p key={item}>• {item}</p>)
                ) : (
                  <p>• {t.backstage.guardStatusNotConfigured}</p>
                )}
              </div>

              <div>
                <p className="mb-2 font-semibold uppercase tracking-wider text-white/40">
                  {t.backstage.guardsLastTurn}
                </p>
                {metrics.lastGuardrailAssessments &&
                metrics.lastGuardrailAssessments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-white/55">
                      {metrics.lastGuardrailIntervened
                        ? t.backstage.guardsIntervened
                        : t.backstage.guardsNotIntervened}
                    </p>
                    {metrics.lastGuardrailAssessments.map((assessment, index) => (
                      <p key={`${assessment.source ?? "assessment"}-${index}`}>
                        • {assessment.source ?? "—"}: {assessment.action ?? assessment.error ?? "—"}
                        {assessment.actionReason
                          ? ` — ${assessment.actionReason}`
                          : ""}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>• {t.backstage.guardsNoAssessments}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </BackstageCard>
  );
}

function formatModelLabel(modelId: string): string {
  if (modelId.includes("nova-2-lite")) return "Nova 2 Lite";
  if (modelId.includes("nova-lite")) return "Nova Lite";
  return modelId.replace(/^us\./, "");
}

function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${(score * 100).toFixed(0)}%`;
}

function formatPassRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

function evalTypeMeta(
  type: string,
  t: ReturnType<typeof useI18n>["t"],
): { title: string; description: string } {
  if (type === "basic") {
    return { title: t.backstage.evalTypeBasicTitle, description: t.backstage.evalTypeBasicDesc };
  }
  if (type === "trajectory") {
    return { title: t.backstage.evalTypeTrajectoryTitle, description: t.backstage.evalTypeTrajectoryDesc };
  }
  if (type === "helpfulness") {
    return { title: t.backstage.evalTypeHelpfulnessTitle, description: t.backstage.evalTypeHelpfulnessDesc };
  }
  return { title: type, description: "" };
}

function EvalScoreCell({
  score,
  passed,
  passedLabel,
  failedLabel,
}: {
  score: number | null | undefined;
  passed: boolean | null | undefined;
  passedLabel: string;
  failedLabel: string;
}) {
  if (score === null || score === undefined) {
    return <span className="text-white/30">—</span>;
  }

  const tone =
    passed === true
      ? "text-emerald-300/90"
      : passed === false
        ? "text-amber-300/85"
        : "text-white/70";

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-semibold tabular-nums ${tone}`}>{formatScore(score)}</span>
      {passed !== null && passed !== undefined && (
        <span className={`text-[9px] uppercase tracking-wide ${tone}`}>
          {passed ? passedLabel : failedLabel}
        </span>
      )}
    </div>
  );
}

function EvalTab() {
  const { t } = useI18n();
  const [comparisons, setComparisons] = useState<EvalComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/evals/results");
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as { comparisons: EvalComparison[] };
        if (!cancelled) setComparisons(data.comparisons ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const caseLabel = (name: string) =>
    t.backstage.evalCases[name as keyof typeof t.backstage.evalCases] ?? name.replace(/-/g, " ");

  return (
    <BackstageCard title={t.backstage.evalTitle} badge={t.backstage.evalBadge}>
      <p className="mb-2 text-sm text-white/50">{t.backstage.evalDescription}</p>
      <p className="mb-5 text-xs text-white/35">{t.backstage.evalScoreLegend}</p>
      {loading && (
        <p className="font-mono text-xs text-white/35">{t.backstage.evalLoading}</p>
      )}
      {error && (
        <p className="font-mono text-xs text-red-300/80">{t.backstage.evalError}</p>
      )}
      {!loading && !error && comparisons.length === 0 && (
        <p className="font-mono text-xs text-white/35">{t.backstage.evalEmpty}</p>
      )}
      {!loading && !error && comparisons.length > 0 && (
        <div className="space-y-8">
          {comparisons.map((comparison) => {
            const meta = evalTypeMeta(comparison.eval_type, t);

            return (
              <section key={comparison.eval_type} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white/85">{meta.title}</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/40">
                    {meta.description}
                  </p>
                </div>

                {comparison.model_summaries && comparison.models.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {comparison.models.map((modelId) => {
                      const summary = comparison.model_summaries?.[modelId];
                      return (
                        <div
                          key={modelId}
                          className="wise-ring rounded-xl bg-black/25 px-3 py-2.5 ring-white/10"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            {formatModelLabel(modelId)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                            <span className="text-white/70">
                              {t.backstage.evalOverallScore}:{" "}
                              <span className="font-semibold text-[var(--wise-mint)]">
                                {formatScore(summary?.overall_score)}
                              </span>
                            </span>
                            <span className="text-white/70">
                              {t.backstage.evalPassRate}:{" "}
                              <span className="font-semibold text-white/85">
                                {formatPassRate(summary?.pass_rate)}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="wise-ring overflow-x-auto rounded-xl bg-black/25 p-2 ring-white/10">
                  <table className="w-full min-w-[360px] border-collapse font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/40">
                        <th className="px-2 py-2 font-semibold uppercase tracking-wider">
                          {t.backstage.evalCase}
                        </th>
                        {comparison.models.map((modelId) => (
                          <th
                            key={modelId}
                            className="px-2 py-2 font-semibold uppercase tracking-wider"
                          >
                            {formatModelLabel(modelId)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((row) => (
                        <tr
                          key={row.case_name}
                          className="border-b border-white/5 text-white/70 transition-colors hover:bg-white/5"
                        >
                          <td className="max-w-[160px] px-2 py-2.5">
                            <p className="font-semibold text-white/80">{caseLabel(row.case_name)}</p>
                            {row.input && (
                              <p className="mt-0.5 truncate text-[10px] text-white/35" title={row.input}>
                                {row.input}
                              </p>
                            )}
                          </td>
                          {comparison.models.map((modelId) => {
                            const cell = row.by_model[modelId];
                            return (
                              <td key={modelId} className="px-2 py-2.5 align-top">
                                <EvalScoreCell
                                  score={cell?.score}
                                  passed={cell?.passed}
                                  passedLabel={t.backstage.evalPassed}
                                  failedLabel={t.backstage.evalFailed}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </BackstageCard>
  );
}

export function BackstageContent({
  activeTab,
  metrics,
  sessionId,
}: {
  activeTab: BackstageTab;
  metrics: SessionMetrics;
  sessionId: string;
}) {
  switch (activeTab) {
    case "sql":
      return <SqlTab sessionId={sessionId} />;
    case "metrics":
      return <MetricsTab metrics={metrics} />;
    case "prompt":
      return <PromptTab />;
    case "observability":
      return <ObservabilityTab metrics={metrics} />;
    case "guards":
      return <GuardsTab metrics={metrics} />;
    case "eval":
      return <EvalTab />;
    default:
      return null;
  }
}
