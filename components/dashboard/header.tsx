"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Search, Plus, Bell, Wifi, WifiOff, Radio } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  systemStatus: "connected" | "disconnected" | "syncing"
}

export function Header({ systemStatus }: HeaderProps) {
  const [now, setNow] = useState(() => new Date())
  const tenantCode = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? "HQ-CASA"

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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
      label: "API connectee",
      icon: Wifi,
      className: "text-primary bg-primary/10",
      dotColor: "bg-primary",
    },
    disconnected: {
      label: "API hors ligne",
      icon: WifiOff,
      className: "text-destructive bg-destructive/10",
      dotColor: "bg-destructive",
    },
    syncing: {
      label: "Synchronisation",
      icon: Radio,
      className: "text-warning bg-warning/10",
      dotColor: "bg-warning animate-pulse",
    },
  }

  const status = statusConfig[systemStatus]
  const StatusIcon = status.icon

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/92 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Recherche globale: employe, badge, terminal, matricule..."
            className="h-9 w-56 bg-input pl-8 placeholder:text-muted-foreground focus-visible:ring-primary lg:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 items-center gap-2 rounded-[3px] border border-border px-2.5 text-[11px] font-medium",
            status.className
          )}
        >
          <div className={cn("h-1.5 w-1.5 rounded-full", status.dotColor)} />
          <StatusIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{status.label}</span>
        </div>

        <div className="hidden h-8 items-center gap-2 rounded-[4px] border border-border bg-secondary/40 px-2.5 text-[11px] font-medium text-muted-foreground md:flex">
          <span className={cn("h-1.5 w-1.5 rounded-full", systemStatus === "disconnected" ? "bg-warning" : "bg-success")} />
          <span>Webhook {systemStatus === "disconnected" ? "a verifier" : "actif"}</span>
        </div>

        <div className="hidden h-8 items-center gap-2 rounded-[4px] border border-border bg-secondary/40 px-2.5 text-[11px] text-muted-foreground xl:flex">
          <span className="font-semibold text-foreground/90">{tenantCode}</span>
          <span>•</span>
          <span>{localTimezone}</span>
          <span>•</span>
          <span>{localDateTime}</span>
        </div>

        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Action rapide</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-border p-0">
              <Avatar className="h-7 w-7 border border-border">
                <AvatarImage src="/placeholder-user.jpg" alt="User" />
                <AvatarFallback className="bg-secondary text-[11px] text-foreground">
                  JD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-[12px] font-medium leading-none text-card-foreground">Administrateur</p>
                <p className="text-[11px] leading-none text-muted-foreground">admin@securepoint.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-muted-foreground hover:text-foreground focus:text-foreground">Profil</DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground hover:text-foreground focus:text-foreground">Parametres</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-destructive focus:text-destructive">Se deconnecter</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
