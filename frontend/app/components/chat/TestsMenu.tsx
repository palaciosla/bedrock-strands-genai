"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "../../i18n/I18nProvider";
import { TEST_MENU } from "../../lib/testPrompts";

export function TestsMenu({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveGroup(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(prompt: string) {
    onSelect(prompt);
    setOpen(false);
    setActiveGroup(null);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Badge
        render={
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => {
              setOpen((current) => !current);
              setActiveGroup(null);
            }}
            className={cn(
              "wise-interactive h-8 cursor-pointer rounded-full border border-border bg-secondary px-3 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        }
      >
        <FlaskConical data-icon="inline-start" aria-hidden />
        {t.tests.label}
      </Badge>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lg"
        >
          {TEST_MENU.map((group) => {
            const groupLabel = t.tests.groups[group.groupKey];
            const isActive = activeGroup === group.groupKey;

            return (
              <div
                key={group.groupKey}
                className="relative"
                onMouseEnter={() => setActiveGroup(group.groupKey)}
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={isActive}
                  onClick={() =>
                    setActiveGroup((current) =>
                      current === group.groupKey ? null : group.groupKey,
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted",
                    isActive && "bg-muted",
                  )}
                >
                  {groupLabel}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </button>

                {isActive && (
                  <div
                    role="menu"
                    className="mt-1 space-y-0.5 border-t border-border pt-1"
                  >
                    {group.cases.map((testCase) => (
                      <button
                        key={testCase.caseKey}
                        type="button"
                        role="menuitem"
                        onClick={() =>
                          handleSelect(t.tests.prompts[testCase.promptKey])
                        }
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        {t.tests.cases[testCase.caseKey]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
