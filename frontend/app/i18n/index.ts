import en from "./locales/en.json";
import es from "./locales/es.json";

export type Locale = "en" | "es";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.es;
}

export const LOCALE_STORAGE_KEY = "reino-canino-locale";

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "es";
}
