"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Globe, LogOut, PanelLeft, UserRound } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { logoutCurrentSession } from "@/lib/api/auth"
import { toast } from "sonner"

interface HeaderProps {
  systemStatus?: "connected" | "disconnected" | "syncing"
  hideRouteInfo?: boolean
  statusDetails?: {
    updatedAt: string
    sources: Array<{
      key: "accessEvents" | "reports" | "employees" | "devices"
      label: string
      status: "ok" | "warning" | "error"
      detail: string
    }>
    webhook: {
      status: "healthy" | "warning" | "offline"
      label: string
      detail: string
      lastEventAt: string | null
    }
  }
}

const SIDEBAR_TOGGLE_EVENT = "securepoint:sidebar-toggle"

export function Header({ hideRouteInfo = false }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, locale, toggleLocale } = useI18n()

  const routeMeta = useMemo(
    () => [
      { href: "/access-logs", title: t.nav.accessLogs, subtitle: t.pages.accessLogsSubtitle },
      { href: "/reports", title: t.nav.reports, subtitle: t.pages.reportsSubtitle },
      { href: "/employees", title: t.employees.title, subtitle: t.employees.subtitle },
      { href: "/planning", title: t.planning.title, subtitle: t.planning.subtitle },
      {
        href: "/timesheet",
        title: locale === "en" ? "Timesheet validation" : "Validation pointages",
        subtitle:
          locale === "en"
            ? "Approve, edit or reject anomalies with full timeline context"
            : "Validez, ajustez ou rejetez les anomalies avec la timeline complète",
      },
      { href: "/devices", title: t.devices.title, subtitle: t.devices.subtitle },
      { href: "/settings", title: t.nav.settings, subtitle: t.pages.settingsSubtitle },
      { href: "/tenant-users", title: "Comptes", subtitle: "Gestion des utilisateurs, rôles et permissions" },
      { href: "/profile", title: t.header.profile, subtitle: "Profil utilisateur et sécurité du compte" },
      { href: "/zones", title: t.nav.zones, subtitle: t.pages.zonesSubtitle },
      { href: "/alerts", title: t.nav.alerts, subtitle: t.pages.alertsSubtitle },
      { href: "/surveillance", title: t.nav.surveillance, subtitle: t.pages.surveillanceSubtitle },
      { href: "/visitors", title: t.nav.visitors, subtitle: t.pages.visitorsSubtitle },
      { href: "/audit", title: t.nav.audit, subtitle: t.pages.auditSubtitle },
      { href: "/integrations", title: t.nav.integrations, subtitle: t.pages.integrationsSubtitle },
      { href: "/billing", title: t.nav.billing, subtitle: t.pages.billingSubtitle },
      { href: "/", title: t.nav.dashboard, subtitle: t.pages.dashboardSubtitle },
    ],
    [t]
  )

  const currentRoute = useMemo(() => {
    if (pathname === "/") {
      return routeMeta[routeMeta.length - 1]
    }
    return routeMeta.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ?? routeMeta[routeMeta.length - 1]
  }, [pathname, routeMeta])

  const toggleSidebar = () => {
    window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))
  }

  const handleLogout = async () => {
    try {
      await logoutCurrentSession()
      toast.success(t.header.logoutSuccess, { description: t.header.logoutDesc })
    } finally {
      router.replace("/login")
    }
  }

  if (hideRouteInfo) {
    return (
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/76 shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur-xl supports-backdrop-filter:bg-background/64 md:hidden">
        <div className="mx-auto flex min-h-15 w-full max-w-430 items-center gap-3 px-4 md:px-5">
          <Button variant="outline" size="icon" onClick={toggleSidebar}>
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/76 shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur-xl supports-backdrop-filter:bg-background/64">
      <div className="mx-auto flex min-h-19 w-full max-w-430 items-center gap-3 px-4 md:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="md:hidden" onClick={toggleSidebar}>
              <PanelLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
                {t.header.operationalSpace}
              </p>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground md:text-[15px]">{currentRoute.title}</p>
                <p className="hidden truncate text-[11px] text-muted-foreground xl:block">{currentRoute.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 font-semibold uppercase tracking-wide"
            onClick={toggleLocale}
            aria-label={`Switch language (current: ${locale.toUpperCase()})`}
            title={locale === "fr" ? "Switch to English" : "Passer en français"}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="text-[11px]">{locale.toUpperCase()}</span>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/profile">
              <UserRound className="mr-1.5 h-3.5 w-3.5" />
              {t.header.profile}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => void handleLogout()}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            {t.header.logout}
          </Button>
        </div>
      </div>
    </header>
  )
}
