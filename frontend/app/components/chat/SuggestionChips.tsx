"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "../../i18n/I18nProvider";

export function SuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (text: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const suggestions = [
    t.suggestions.tableToday,
    t.suggestions.vegetarian,
    t.suggestions.history,
    t.suggestions.dessert,
  ];

  return (
    <div className="flex flex-wrap gap-2 px-6 pb-3">
      {suggestions.map((label) => (
        <Button
          key={label}
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(label)}
          className="wise-interactive h-auto rounded-full px-4 py-1.5 text-xs font-semibold"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
