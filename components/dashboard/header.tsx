"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Search, Plus, Bell, Wifi, WifiOff, Radio, PanelLeft, Sun, Moon, Settings, User, LogOut, FileText, Users, Cpu, BellOff, Languages } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"

interface HeaderProps {
  systemStatus?: "connected" | "disconnected" | "syncing"
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

export function Header({ systemStatus = "connected", statusDetails }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const tenantCode = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? "HQ-CASA"
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { locale, toggleLocale, t } = useI18n()

  const routeMeta = useMemo(() => [
    { href: "/access-logs",  title: t.nav.accessLogs,      subtitle: t.pages.accessLogsSubtitle },
    { href: "/reports",      title: t.nav.reports,          subtitle: t.pages.reportsSubtitle },
    { href: "/employees",    title: t.employees.title,      subtitle: t.employees.subtitle },
    { href: "/planning",     title: t.planning.title,       subtitle: t.planning.subtitle },
    { href: "/devices",      title: t.devices.title,        subtitle: t.devices.subtitle },
    { href: "/settings",     title: t.nav.settings,         subtitle: t.pages.settingsSubtitle },
    { href: "/zones",        title: t.nav.zones,            subtitle: t.pages.zonesSubtitle },
    { href: "/alerts",       title: t.nav.alerts,           subtitle: t.pages.alertsSubtitle },
    { href: "/surveillance", title: t.nav.surveillance,     subtitle: t.pages.surveillanceSubtitle },
    { href: "/visitors",     title: t.nav.visitors,         subtitle: t.pages.visitorsSubtitle },
    { href: "/audit",        title: t.nav.audit,            subtitle: t.pages.auditSubtitle },
    { href: "/integrations", title: t.nav.integrations,     subtitle: t.pages.integrationsSubtitle },
    { href: "/billing",      title: t.nav.billing,          subtitle: t.pages.billingSubtitle },
    { href: "/",             title: t.nav.dashboard,        subtitle: t.pages.dashboardSubtitle },
  ], [t])

  const routeWithSearch = useCallback(
    (path: string, query: string) => `${path}?search=${encodeURIComponent(query)}`,
    []
  )

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    // Route to the most relevant page based on keywords
    const lower = q.toLowerCase()
    if (lower.includes("log") || lower.includes("acces") || lower.includes("event")) {
      router.push(routeWithSearch("/access-logs", q))
    } else if (lower.includes("employ") || lower.includes("badge") || lower.includes("matricule")) {
      router.push(routeWithSearch("/employees", q))
    } else if (lower.includes("appareil") || lower.includes("device") || lower.includes("terminal")) {
      router.push(routeWithSearch("/devices", q))
    } else if (lower.includes("rapport") || lower.includes("report") || lower.includes("pointage")) {
      router.push(routeWithSearch("/reports", q))
    } else if (lower.includes("calendrier") || lower.includes("schedule")) {
      router.push("/planning?view=schedule")
    } else if (lower.includes("quart") || lower.includes("shift")) {
      router.push("/planning?view=shift")
    } else if (lower.includes("planning") || lower.includes("timetable")) {
      router.push("/planning?view=timetable")
    } else if (lower.includes("param") || lower.includes("config") || lower.includes("setting")) {
      router.push("/settings")
    } else {
      // Default: go to employees (most search-related page)
      router.push(routeWithSearch("/employees", q))
    }
    setSearchQuery("")
    setMobileSearchOpen(false)
    toast.info(`${t.header.searchRoute}: "${q}"`, { description: t.header.searchRouteDesc })
  }, [routeWithSearch, searchQuery, router, t])

  const handleLogout = useCallback(() => {
    toast.success(t.header.logoutSuccess, { description: t.header.logoutDesc })
    router.push("/")
  }, [router, t])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setMobileSearchOpen(false)
  }, [pathname])

  const currentRoute = useMemo(() => {
    if (pathname === "/") {
      return routeMeta[routeMeta.length - 1]
    }
    return routeMeta.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ?? routeMeta[routeMeta.length - 1]
  }, [pathname, routeMeta])

  const localTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", [])
  const localDateTime = useMemo(
    () =>
      now.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [now]
  )

  const statusConfig = {
    connected: {
      label: t.header.apiConnected,
      icon: Wifi,
      className: "text-primary bg-primary/12",
      dotColor: "bg-primary",
    },
    disconnected: {
      label: t.header.apiOffline,
      icon: WifiOff,
      className: "text-destructive bg-destructive/12",
      dotColor: "bg-destructive",
    },
    syncing: {
      label: t.header.apiSyncing,
      icon: Radio,
      className: "text-warning bg-warning/12",
      dotColor: "bg-warning",
    },
  }

  const status = statusConfig[systemStatus]
  const StatusIcon = status.icon
  const sourceStates = statusDetails?.sources ?? []
  const webhookStatus = statusDetails?.webhook.status ?? (systemStatus === "disconnected" ? "offline" : "healthy")
  const webhookLabel = statusDetails?.webhook.label ?? (systemStatus === "disconnected" ? "Webhook a verifier" : "Webhook actif")
  const webhookDetail = statusDetails?.webhook.detail ?? "Etat derive du statut API global"
  const updatedAtLabel = statusDetails?.updatedAt
    ? new Date(statusDetails.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null

  const toggleSidebar = () => {
    window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/76 shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur-xl supports-backdrop-filter:bg-background/64">
      <div className="mx-auto flex min-h-19 w-full max-w-430 items-center justify-between gap-3 px-4 md:px-5">
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
                <p className="truncate text-sm font-semibold tracking-tight text-foreground md:text-[15px]">
                  {currentRoute.title}
                </p>
                <p className="hidden truncate text-[11px] text-muted-foreground xl:block">
                  {currentRoute.subtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="relative ml-2 hidden xl:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Recherche globale: employe, badge, terminal, matricule..."
                className="h-9 w-88 bg-input/90 pl-8 placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="icon" className="xl:hidden" onClick={() => setMobileSearchOpen((current) => !current)}>
            <Search className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "wow-transition flex h-8 items-center gap-2 rounded-lg border border-border/70 px-2.5 text-[11px] font-semibold shadow-[0_6px_14px_rgba(0,0,0,0.14)]",
                  status.className
                )}
              >
                <div className={cn("h-1.5 w-1.5 rounded-full", status.dotColor, systemStatus !== "disconnected" && "pulse-soft")} />
                <StatusIcon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{status.label}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-84 border-border/70 bg-card/95 p-0">
              <div className="border-b border-border/70 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{t.header.sourcesTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.header.sourcesSubtitle}</p>
              </div>
              <div className="space-y-2 px-4 py-3">
                {sourceStates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.header.noDetail}</p>
                ) : (
                  sourceStates.map((source) => (
                    <div key={source.key} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground">{source.label}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            source.status === "ok"
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : source.status === "warning"
                                ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-400"
                          )}
                        >
                          {source.status === "ok" ? t.header.statusOk : source.status === "warning" ? t.header.statusPartial : t.header.statusError}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{source.detail}</p>
                    </div>
                  ))
                )}
              </div>
              {updatedAtLabel ? (
                <div className="border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground">
                  {t.header.lastUpdated}: {updatedAtLabel}
                </div>
              ) : null}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "hidden h-8 items-center gap-2 rounded-lg border px-2.5 text-[11px] font-medium lg:flex",
                  webhookStatus === "healthy"
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : webhookStatus === "warning"
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-400"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    webhookStatus === "healthy"
                      ? "bg-emerald-400"
                      : webhookStatus === "warning"
                        ? "bg-amber-400"
                        : "bg-red-400"
                  )}
                />
                <span>{webhookLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-76 border-border/70 bg-card/95 p-0">
              <div className="border-b border-border/70 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{t.header.webhookHealth}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground">{webhookDetail}</p>
                {statusDetails?.webhook.lastEventAt ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Dernier evenement: {new Date(statusDetails.webhook.lastEventAt).toLocaleString("fr-FR")}
                  </p>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden h-8 items-center gap-2 rounded-lg border border-border/70 bg-secondary/50 px-2.5 text-[11px] text-muted-foreground 2xl:flex">
            <span className="font-semibold text-foreground/90">{tenantCode}</span>
            <span>-</span>
            <span>{localTimezone}</span>
            <span>-</span>
            <span>{localDateTime}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-[0_10px_24px_rgba(78,155,255,0.28)]">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{t.header.quickAction}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-card/95 border-border/70">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t.header.quickActions}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => router.push("/employees?action=new-employee")} className="gap-2 text-muted-foreground hover:text-foreground focus:text-foreground">
                <Users className="h-4 w-4" /> {t.employees.add}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/devices?action=new-device")} className="gap-2 text-muted-foreground hover:text-foreground focus:text-foreground">
                <Cpu className="h-4 w-4" /> {t.devices.addDevice}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/reports?action=generate-report")} className="gap-2 text-muted-foreground hover:text-foreground focus:text-foreground">
                <FileText className="h-4 w-4" /> {t.header.generateReport}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/access-logs")} className="gap-2 text-muted-foreground hover:text-foreground focus:text-foreground">
                <Search className="h-4 w-4" /> {t.header.accessLog}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="pulse-soft absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 border-border/70 bg-card/95 p-0">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{t.header.notifications}</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setNotificationsOpen(false); toast.info(t.header.markAllRead) }}>
                  {t.header.markAllRead}
                </Button>
              </div>
              <div className="divide-y divide-border/50">
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                  <p className="text-xs font-medium text-foreground">{t.header.notifSyncDone}</p>
                  <p className="text-xs text-muted-foreground">{t.header.notifSyncDoneDesc}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">{t.header.notif5min}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-warning" />
                  <div>
                  <p className="text-xs font-medium text-foreground">{t.header.notifDeviceOffline}</p>
                  <p className="text-xs text-muted-foreground">{t.header.notifDeviceOfflineDesc}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">{t.header.notif15min}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                  <div>
                  <p className="text-xs font-medium text-foreground">{t.header.notifDenied}</p>
                  <p className="text-xs text-muted-foreground">{t.header.notifDeniedDesc}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">{t.header.notif1h}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border/70 px-4 py-2">
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs text-primary" onClick={() => { setNotificationsOpen(false); router.push("/access-logs") }}>
                  {t.header.viewFullLog}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={toggleLocale}
            title={locale === "fr" ? "Switch to English" : "Passer en français"}
          >
            <Languages className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground">
              {locale.toUpperCase()}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Basculer le theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-border/70 bg-secondary/40 p-0">
                <Avatar className="h-7 w-7 border border-border/70">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback className="bg-secondary text-[11px] text-foreground">
                    JD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card/95 border-border/70" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-[12px] font-medium leading-none text-card-foreground">Administrateur</p>
                  <p className="text-[11px] leading-none text-muted-foreground">admin@securepoint.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild className="gap-2 text-muted-foreground hover:text-foreground focus:text-foreground">
                <Link href="/settings"><User className="h-4 w-4" /> {t.header.profile}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 text-muted-foreground hover:text-foreground focus:text-foreground">
                <Link href="/settings"><Settings className="h-4 w-4" /> {t.nav.settings}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> {t.header.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="border-t border-border/65 xl:hidden">
          <form onSubmit={handleSearch} className="mx-auto w-full max-w-430 px-4 py-3 md:px-5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Recherche globale: employe, badge, terminal, matricule..."
                className="h-9 w-full bg-input/90 pl-8 placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </form>
        </div>
      ) : null}
    </header>
  )
}
