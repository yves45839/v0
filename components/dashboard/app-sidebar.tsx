"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AUTH_EVENTS, getAuthSession } from "@/lib/api/auth"
import { SectionKey, useSectionDefinitions, findSectionForPath } from "@/components/dashboard/section-tabs"
import { LRLogoMark } from "@/components/brand/lr-logo-mark"

const SIDEBAR_TOGGLE_EVENT = "securepoint:sidebar-toggle"
const DESKTOP_SIDEBAR_OPEN_KEY = "securepoint:sidebar-desktop-open"
const SIDEBAR_EXPANDED_WIDTH = "224px"
const SIDEBAR_COLLAPSED_WIDTH = "72px"

const SECTION_ICON_BY_KEY: Record<SectionKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  personnes: Users,
  planning: CalendarDays,
  appareils: Cpu,
  rapports: BarChart3,
}

type SidebarUser = {
  initials: string
  name: string
  role: string
}

type SidebarNavProps = {
  collapsed?: boolean
  mobile?: boolean
  onToggle?: () => void
  pathname: string
  onNavigate?: () => void
  user: SidebarUser
}

function getInitials(label: string): string {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
  }

  const compact = label.replace(/[^a-zA-Z0-9]/g, "")
  return (compact.slice(0, 2) || "LR").toUpperCase()
}

function getSidebarUser(): SidebarUser {
  const session = getAuthSession()
  const user = session?.user
  const name =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
    user?.username ||
    user?.email ||
    "Utilisateur"
  const activeTenant =
    session?.tenants.find((tenant) => tenant.code === session.activeTenantCode) ??
    session?.tenants[0]

  return {
    initials: getInitials(name),
    name,
    role: (activeTenant?.role || "Admin").replace(/[_-]/g, " ").toUpperCase(),
  }
}

function SidebarNav({
  collapsed = false,
  mobile = false,
  onToggle,
  pathname,
  onNavigate,
  user,
}: SidebarNavProps) {
  const sections = useSectionDefinitions()

  const compact = collapsed && !mobile

  const activeSectionKey = useMemo(
    () => findSectionForPath(sections, pathname)?.key ?? null,
    [sections, pathname]
  )

  const navItems = useMemo(
    () =>
      sections.map((section) => ({
        key: section.key,
        name: section.label,
        href: section.defaultHref,
        icon: SECTION_ICON_BY_KEY[section.key],
      })),
    [sections]
  )

  return (
    <>
      <div
        className={cn(
          "relative flex h-14 items-center border-b border-sidebar-border",
          compact ? "justify-start px-2" : "gap-3 px-3"
        )}
      >
        <Link
          href="/"
          aria-label="LR Time"
          className={cn("flex min-w-0 items-center", compact ? "justify-center" : "gap-3")}
          onClick={onNavigate}
        >
            <LRLogoMark />
          {!compact && (
            <span className="font-mono text-[13px] font-bold leading-none text-sidebar-foreground">
              LR <span className="text-[#f97316]">TIME</span>
            </span>
          )}
        </Link>

        {!mobile && (
          <button
            type="button"
            aria-label={compact ? "Etendre la barre laterale" : "Reduire la barre laterale"}
            aria-expanded={!compact}
            title={compact ? "Etendre" : "Reduire"}
            onClick={onToggle}
            className={cn(
              "ml-auto inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              compact && "absolute right-1 h-7 w-7"
            )}
          >
            {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav
        className={cn(
          "dense-scrollbar relative flex-1 overflow-y-auto py-5",
          compact ? "space-y-2 px-2" : "space-y-2 px-2.5"
        )}
        aria-label="Menu principal"
      >
        {!compact && (
          <p className="px-1.5 pb-1 text-[10px] font-medium uppercase text-muted-foreground">
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const isActive = activeSectionKey === item.key
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.name}
              aria-label={item.name}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-11 items-center border-l-2 border-l-transparent text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                compact ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "border-l-sidebar-primary bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )}
              />
              {!compact && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn("relative border-t border-sidebar-border py-3", compact ? "px-2" : "px-3")}>
        {compact ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/profile"
              onClick={onNavigate}
              title={user.name}
              aria-label={user.name}
              className="flex h-10 w-10 items-center justify-center bg-sidebar-accent text-[11px] font-bold text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80"
            >
              {user.initials}
            </Link>
            <Link
              href="/settings"
              onClick={onNavigate}
              title="Parametres"
              aria-label="Parametres"
              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-sidebar-border bg-sidebar-accent p-2">
            <Link
              href="/profile"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-3"
              title={user.name}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
                {user.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-sidebar-foreground">{user.name}</span>
                <span className="block truncate text-[10px] font-medium uppercase text-muted-foreground">{user.role}</span>
              </span>
            </Link>

            <Link
              href="/settings"
              onClick={onNavigate}
              title="Parametres"
              aria-label="Parametres"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [sidebarUser, setSidebarUser] = useState<SidebarUser>(() => getSidebarUser())

  useEffect(() => {
    const savedDesktopOpen = window.localStorage.getItem(DESKTOP_SIDEBAR_OPEN_KEY)
    if (savedDesktopOpen != null) {
      setDesktopOpen(savedDesktopOpen === "true")
    }
  }, [])

  useEffect(() => {
    const handleToggle = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setDesktopOpen((current) => !current)
      } else {
        setMobileOpen((current) => !current)
      }
    }
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle)
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_OPEN_KEY, String(desktopOpen))
  }, [desktopOpen])

  useEffect(() => {
    const updateShellOffset = () => {
      const root = document.documentElement
      if (!window.matchMedia("(min-width: 768px)").matches) {
        root.style.setProperty("--app-sidebar-width", "0rem")
        return
      }

      root.style.setProperty(
        "--app-sidebar-width",
        desktopOpen ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH
      )
    }

    updateShellOffset()
    window.addEventListener("resize", updateShellOffset)
    return () => {
      window.removeEventListener("resize", updateShellOffset)
      document.documentElement.style.removeProperty("--app-sidebar-width")
    }
  }, [desktopOpen])

  useEffect(() => {
    const syncSidebarIdentity = () => {
      setSidebarUser(getSidebarUser())
    }
    window.addEventListener(AUTH_EVENTS.SESSION_CHANGED, syncSidebarIdentity)
    window.addEventListener("storage", syncSidebarIdentity)
    return () => {
      window.removeEventListener(AUTH_EVENTS.SESSION_CHANGED, syncSidebarIdentity)
      window.removeEventListener("storage", syncSidebarIdentity)
    }
  }, [])

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[18px_0_42px_rgba(0,0,0,0.08)] dark:shadow-[18px_0_42px_rgba(0,0,0,0.4)] transition-[width] duration-300 md:flex",
          desktopOpen ? "w-[224px]" : "w-[72px]"
        )}
      >
        <SidebarNav
          collapsed={!desktopOpen}
          onToggle={() => setDesktopOpen((current) => !current)}
          pathname={pathname}
          user={sidebarUser}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[250px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground p-0 md:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col overflow-hidden">
            <SidebarNav
              mobile
              pathname={pathname}
              user={sidebarUser}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
