"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

export type SectionKey = "dashboard" | "personnes" | "planning" | "appareils" | "rapports"

export type SectionTab = {
  href: string
  label: string
}

export type SectionDefinition = {
  key: SectionKey
  label: string
  defaultHref: string
  tabs: SectionTab[]
}

export function useSectionDefinitions(): SectionDefinition[] {
  const { t, locale } = useI18n()

  return useMemo<SectionDefinition[]>(
    () => [
      {
        key: "dashboard",
        label: locale === "en" ? "Dashboard" : "Dashboard",
        defaultHref: "/",
        tabs: [
          { href: "/", label: locale === "en" ? "Overview" : "Vue d'ensemble" },
          { href: "/alerts", label: t.nav.alerts },
        ],
      },
      {
        key: "personnes",
        label: locale === "en" ? "People" : "Personnes",
        defaultHref: "/employees",
        tabs: [
          { href: "/employees", label: t.nav.employees },
          { href: "/tenant-users", label: locale === "en" ? "Accounts" : "Comptes" },
          { href: "/profile", label: locale === "en" ? "My profile" : "Mon profil" },
          { href: "/visitors", label: t.nav.visitors },
        ],
      },
      {
        key: "planning",
        label: locale === "en" ? "Planning" : "Planning",
        defaultHref: "/planning",
        tabs: [
          { href: "/planning", label: locale === "en" ? "Schedules" : "Plannings" },
          { href: "/timesheet", label: locale === "en" ? "Timesheets" : "Pointages" },
          { href: "/absences", label: locale === "en" ? "Time off" : "Congés" },
        ],
      },
      {
        key: "appareils",
        label: locale === "en" ? "Devices" : "Appareils",
        defaultHref: "/devices",
        tabs: [
          { href: "/devices", label: t.nav.devices },
          { href: "/access-logs", label: t.nav.accessLogs },
          { href: "/surveillance", label: t.nav.surveillance },
          { href: "/zones", label: t.nav.zones },
        ],
      },
      {
        key: "rapports",
        label: locale === "en" ? "Reports" : "Rapports",
        defaultHref: "/reports",
        tabs: [
          { href: "/reports", label: t.nav.reports },
          { href: "/audit", label: t.nav.audit },
          { href: "/billing", label: t.nav.billing },
          { href: "/integrations", label: t.nav.integrations },
        ],
      },
    ],
    [t, locale]
  )
}

function tabMatchesPath(tabHref: string, pathname: string): boolean {
  if (tabHref === "/") return pathname === "/"
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`)
}

export function findSectionForPath(
  sections: SectionDefinition[],
  pathname: string
): SectionDefinition | null {
  return (
    sections.find((section) =>
      section.tabs.some((tab) => tabMatchesPath(tab.href, pathname))
    ) ?? null
  )
}

export function SectionTabs() {
  const pathname = usePathname()
  const sections = useSectionDefinitions()

  const section = useMemo(() => findSectionForPath(sections, pathname), [sections, pathname])

  if (!section || section.tabs.length <= 1) {
    return null
  }

  return (
    <div className="border-b border-border/60 bg-background/72 backdrop-blur-md">
      <div className="mx-auto w-full max-w-430 px-4 md:px-5">
        <nav
          aria-label={`${section.label} sections`}
          className="dense-scrollbar flex items-center gap-1 overflow-x-auto py-1.5"
        >
          {section.tabs.map((tab) => {
            const isActive = tabMatchesPath(tab.href, pathname)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "wow-transition relative inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-[12px] font-semibold tracking-[0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                  isActive
                    ? "border-primary/35 bg-primary/12 text-foreground shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
                    : "border-transparent text-muted-foreground hover:border-primary/20 hover:bg-sidebar-accent/70 hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
