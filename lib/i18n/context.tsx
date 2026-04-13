"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { translations, type Locale } from "./translations"

type I18nContextValue = {
  locale: Locale
  t: typeof translations.fr
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("securepoint-locale") as Locale | null
      if (stored === "fr" || stored === "en") return stored
      const browser = navigator.language.slice(0, 2).toLowerCase()
      if (browser === "en") return "en"
    }
    return "fr"
  })

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("securepoint-locale", next)
    }
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fr" ? "en" : "fr")
  }, [locale, setLocale])

  const t = translations[locale]

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider")
  return ctx
}
