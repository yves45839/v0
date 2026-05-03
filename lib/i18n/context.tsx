"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  LOCALE_TAGS,
  isLocale,
  normalizeLocale,
  type Locale,
} from "./config"
import { translations } from "./translations"

type DateInput = Date | number | string

type I18nContextValue = {
  locale: Locale
  localeTag: string
  t: (typeof translations)[Locale]
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  formatTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const key = `${name}=`
  const pairs = document.cookie.split(";")
  for (const pair of pairs) {
    const value = pair.trim()
    if (value.startsWith(key)) {
      return decodeURIComponent(value.slice(key.length))
    }
  }
  return null
}

function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (isLocale(stored)) return stored

  const cookieLocale = readCookie(LOCALE_COOKIE_NAME)
  if (isLocale(cookieLocale)) return cookieLocale

  return normalizeLocale(window.navigator.language, DEFAULT_LOCALE)
}

function parseDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale)

  const setLocale = useCallback((next: Locale) => {
    const normalized = normalizeLocale(next, DEFAULT_LOCALE)
    setLocaleState(normalized)
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
      document.cookie = `${LOCALE_COOKIE_NAME}=${normalized}; path=/; max-age=31536000; samesite=lax`
    }
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fr" ? "en" : "fr")
  }, [locale, setLocale])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = LOCALE_TAGS[locale]
    document.documentElement.setAttribute("data-locale", locale)
  }, [locale])

  const localeTag = LOCALE_TAGS[locale]
  const t = useMemo(() => translations[locale], [locale])

  const formatDate = useCallback(
    (value: DateInput, options?: Intl.DateTimeFormatOptions) => {
      const date = parseDate(value)
      if (!date) return ""
      return new Intl.DateTimeFormat(localeTag, options).format(date)
    },
    [localeTag]
  )

  const formatTime = useCallback(
    (value: DateInput, options?: Intl.DateTimeFormatOptions) => {
      const date = parseDate(value)
      if (!date) return ""
      const defaults: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
      return new Intl.DateTimeFormat(localeTag, { ...defaults, ...options }).format(date)
    },
    [localeTag]
  )

  const formatDateTime = useCallback(
    (value: DateInput, options?: Intl.DateTimeFormatOptions) => {
      const date = parseDate(value)
      if (!date) return ""
      const defaults: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
      return new Intl.DateTimeFormat(localeTag, { ...defaults, ...options }).format(date)
    },
    [localeTag]
  )

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(localeTag, options).format(value)
    },
    [localeTag]
  )

  return (
    <I18nContext.Provider
      value={{ locale, localeTag, t, setLocale, toggleLocale, formatDate, formatTime, formatDateTime, formatNumber }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider")
  return ctx
}
