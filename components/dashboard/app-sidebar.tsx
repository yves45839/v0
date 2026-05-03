"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Cpu, BarChart3, Shield, CalendarDays, Settings, UserRound, UserCog, ClipboardCheck, Plane } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/lib/i18n/context"
import { AUTH_EVENTS, getActiveTenantCode } from "@/lib/api/auth"

const SIDEBAR_TOGGLE_EVENT = "securepoint:sidebar-toggle"

type SidebarNavProps = {
  mobile?: boolean
  pathname: string
  onNavigate?: () => void
  tenantCode: string
}

function SidebarNav({ mobile = false, pathname, onNavigate, tenantCode }: SidebarNavProps) {
  const { t, locale } = useI18n()

  const navItems = useMemo(
    () => [
      { name: "Accueil", href: "/", icon: LayoutDashboard },
      { name: "Personnes", href: "/employees", icon: Users },
      { name: "Comptes", href: "/tenant-users", icon: UserCog },
      { name: "Mon profil", href: "/profile", icon: UserRound },
      { name: "Plannings", href: "/planning", icon: CalendarDays },
      { name: locale === "en" ? "Timesheets" : "Pointages", href: "/timesheet", icon: ClipboardCheck },
      { name: locale === "en" ? "Time off" : "Congés", href: "/absences", icon: Plane },
      { name: "Appareils", href: "/devices", icon: Cpu },
      { name: t.nav.reports, href: "/reports", icon: BarChart3 },
    ],
    [t, locale]
  )

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/22 via-primary/8 to-transparent" />

      <div
        className={cn(
          "relative flex items-center border-b border-sidebar-border/70",
          mobile ? "h-16 px-4" : "h-16 justify-center px-3 lg:justify-start"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/20 shadow-[0_8px_18px_rgba(78,155,255,0.25)]">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className={cn("min-w-0", mobile ? "ml-3" : "ml-0 lg:ml-3")}>
          <span className={cn("text-[13px] font-semibold tracking-widest text-sidebar-foreground", mobile ? "block" : "hidden lg:block")}>
            SecurePoint
          </span>
          <span className={cn("text-[10px] uppercase tracking-[0.16em] text-muted-foreground", mobile ? "block" : "hidden lg:block")}>
            Control Center
          </span>
        </div>
      </div>

      <nav
        className={cn(
          "dense-scrollbar relative flex-1 overflow-y-auto",
          mobile ? "space-y-1.5 px-3 py-4" : "space-y-1.5 px-2 py-3"
        )}
      >
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              aria-label={item.name}
              onClick={onNavigate}
              className={cn(
                "group wow-transition relative flex h-10 items-center rounded-lg border border-transparent text-[12px] font-semibold tracking-[0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 press-effect",
                mobile ? "gap-3 px-3" : "justify-center gap-0 px-3 lg:justify-start lg:gap-3",
                isActive
                  ? "border-primary/30 bg-linear-to-r from-primary/22 via-primary/10 to-transparent text-sidebar-foreground shadow-[0_10px_24px_rgba(0,0,0,0.18)] before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.75 before:rounded-r-sm before:bg-primary"
                  : "text-muted-foreground hover:border-primary/20 hover:bg-sidebar-accent/90 hover:text-sidebar-foreground hover:shadow-[0_8px_16px_rgba(0,0,0,0.18)]"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )}
              />
              <span className={cn("truncate", mobile ? "block" : "hidden lg:block")}>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className={cn("relative border-t border-sidebar-border/70", mobile ? "px-4 py-4" : "px-2 py-3 lg:px-3")}>
        <div
          className={cn(
            "rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50",
            mobile ? "space-y-2 p-3" : "space-y-1.5 p-2.5"
          )}
        >
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="pulse-soft h-1.5 w-1.5 rounded-full bg-success" />
            <span>{t.nav.gatewayConnected}</span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground/80">{t.nav.tenant}: {tenantCode}</p>

          <Link
            href="/settings"
            onClick={onNavigate}
            className="mt-1 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-sidebar-border/70 bg-background/60 text-[11px] font-semibold text-foreground hover:bg-background/85"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Parametres</span>
          </Link>
        </div>
      </div>
    </>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tenantCode, setTenantCode] = useState<string>(
    getActiveTenantCode(process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? "TENANT")
  )

  useEffect(() => {
    const handleToggle = () => setMobileOpen((current) => !current)
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle)
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle)
  }, [])

  useEffect(() => {
    const syncTenantCode = () => setTenantCode(getActiveTenantCode(process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? "TENANT"))
    window.addEventListener(AUTH_EVENTS.SESSION_CHANGED, syncTenantCode)
    window.addEventListener("storage", syncTenantCode)
    return () => {
      window.removeEventListener(AUTH_EVENTS.SESSION_CHANGED, syncTenantCode)
      window.removeEventListener("storage", syncTenantCode)
    }
  }, [])

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-21 flex-col overflow-hidden border-r border-sidebar-border/85 bg-sidebar/95 shadow-[0_0_42px_rgba(0,0,0,0.28)] backdrop-blur-xl md:flex lg:w-64">
        <SidebarNav pathname={pathname} tenantCode={tenantCode} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-85 border-r border-sidebar-border/85 bg-sidebar/96 p-0 md:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col overflow-hidden">
            <SidebarNav mobile pathname={pathname} tenantCode={tenantCode} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
