"use client";

import { Button } from "@/components/ui/button";
import { Locale } from "../../i18n";
import { useI18n } from "../../i18n/I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const options: { value: Locale; label: string }[] = [
    { value: "es", label: t.lang.es },
    { value: "en", label: t.lang.en },
  ];

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--wise-gray)]">
        {t.lang.switch}
      </span>
      <div className="flex rounded-full border border-[rgba(14,15,12,0.14)] bg-[var(--wise-surface)] p-0.5 shadow-[inset_0_1px_2px_rgba(14,15,12,0.06)]">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => setLocale(option.value)}
            className={
              locale === option.value
                ? "wise-interactive rounded-full bg-[var(--wise-dark-green)] text-[var(--wise-mint)] shadow-sm hover:bg-[var(--wise-dark-green)] hover:text-[var(--wise-mint)]"
                : "wise-interactive rounded-full text-[var(--wise-gray)] hover:bg-[var(--wise-cream-light)] hover:text-[var(--wise-near-black)]"
            }
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
