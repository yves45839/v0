export const SUPPORTED_LOCALES = ["fr", "en"] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_STORAGE_KEY = "securepoint-locale"
export const LOCALE_COOKIE_NAME = "securepoint_language"

export const LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en"
}

export function normalizeLocale(value: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (isLocale(normalized)) return normalized
  const short = normalized.slice(0, 2)
  return isLocale(short) ? short : fallback
}
