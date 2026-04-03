"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  FileText,
  Cpu,
  BarChart3,
  Settings,
  Shield,
  CalendarDays,
  PanelsTopLeft,
  Building2,
  Server,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigationGroups = [
  {
    title: "Pilotage",
    icon: PanelsTopLeft,
    items: [
      { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
      { name: "Journaux d'acces", href: "/access-logs", icon: FileText },
      { name: "Rapports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Ressources RH",
    icon: Building2,
    items: [
      { name: "Employes", href: "/employees", icon: Users },
      { name: "Planning", href: "/planning", icon: CalendarDays },
    ],
  },
  {
    title: "Infrastructure",
    icon: Server,
    items: [{ name: "Appareils", href: "/devices", icon: Cpu }],
  },
  {
    title: "Administration",
    icon: Settings,
    items: [{ name: "Parametres", href: "/settings", icon: Settings }],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const tenantCode = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? "TENANT"

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col border-r border-sidebar-border bg-sidebar lg:w-64">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="hidden text-[13px] font-semibold tracking-[0.08em] text-sidebar-foreground lg:block">
          SecurePoint
        </span>
      </div>

      <nav className="dense-scrollbar flex-1 space-y-4 overflow-y-auto p-2">
        {navigationGroups.map((group) => {
          const GroupIcon = group.icon
          return (
            <div key={group.title} className="space-y-1.5">
              <div className="hidden items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:flex">
                <GroupIcon className="h-3.5 w-3.5" />
                <span>{group.title}</span>
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={item.name}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-[4px] px-3 text-[12px] font-medium transition-[background-color,color] hover:bg-sidebar-accent",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-foreground before:absolute before:bottom-1 before:left-0 before:top-1 before:w-[3px] before:rounded-r-sm before:bg-primary"
                        : "text-muted-foreground hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                    />
                    <span className="hidden truncate lg:block">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="hidden space-y-1 lg:block">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            <span>Gateway connectee</span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground/80">Tenant: {tenantCode}</p>
        </div>
      </div>
    </aside>
  )
}
