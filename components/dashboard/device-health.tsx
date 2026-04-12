"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Cpu, DoorOpen, RefreshCw, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Device } from "@/components/dashboard/types"
import Link from "next/link"
import { toast } from "sonner"

interface DeviceHealthProps {
  devices: Device[]
}

const deviceTypeIcons = {
  door_controller: DoorOpen,
  turnstile: Cpu,
  reader: Cpu,
}

const statusConfig = {
  online: {
    label: "En ligne",
    dotColor: "bg-primary",
    textColor: "text-primary",
  },
  offline: {
    label: "Hors ligne",
    dotColor: "bg-destructive",
    textColor: "text-destructive",
  },
  warning: {
    label: "A surveiller",
    dotColor: "bg-warning animate-pulse",
    textColor: "text-warning",
  },
}

export function DeviceHealth({ devices }: DeviceHealthProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const sortedDevices = [...devices].sort((left, right) => {
    const severity = { offline: 0, warning: 1, online: 2 } as const
    return severity[left.status] - severity[right.status] || left.name.localeCompare(right.name)
  })
  const onlineCount = devices.filter((d) => d.status === "online").length
  const offlineCount = devices.filter((d) => d.status === "offline").length
  const warningCount = devices.filter((d) => d.status === "warning").length

  return (
    <Card className="h-full border-border/70 bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Sante des appareils
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Controleurs et lecteurs Hikvision</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary"
            asChild
          >
            <Link href="/devices">
              Voir tout
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true)
              toast.info("Actualisation des appareils...")
              router.refresh()
              setTimeout(() => {
                setRefreshing(false)
                toast.success("Etat des appareils actualise")
              }, 700)
            }}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {/* Summary */}
        <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-border/70 bg-secondary/45 p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-card-foreground">{onlineCount}</span> En ligne
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-card-foreground">{offlineCount}</span> Hors ligne
            </span>
            {offlineCount > 0 ? (
              <Button variant="link" size="sm" className="h-6 px-0 text-xs" asChild>
                <Link href="/devices?status=offline">Diagnostiquer</Link>
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-card-foreground">{warningCount}</span> A surveiller
            </span>
            {warningCount > 0 ? (
              <Button variant="link" size="sm" className="h-6 px-0 text-xs" asChild>
                <Link href="/devices?status=warning">Voir les alertes</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Device List */}
        <ScrollArea className="h-80">
          <div className="space-y-2 pr-4 stagger-children">
            {sortedDevices.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <Cpu className="mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucun appareil détecté</p>
                <Button variant="link" size="sm" className="mt-2 text-xs" asChild>
                  <Link href="/devices">Configurer les appareils</Link>
                </Button>
              </div>
            )}
            {sortedDevices.map((device) => {
              const Icon = deviceTypeIcons[device.type]
              const status = statusConfig[device.status]

              return (
                <Link
                  href="/devices"
                  key={device.id}
                  className={cn(
                    "group card-shine wow-transition flex items-center justify-between rounded-xl border border-border/70 bg-background/35 p-3 hover:border-primary/35 hover:bg-secondary/40",
                    device.status === "offline" && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        device.status === "online"
                          ? "bg-primary/10 text-primary"
                          : device.status === "warning"
                          ? "bg-warning/10 text-warning"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{device.name}</p>
                      <p className="text-xs text-muted-foreground">{device.location}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-1.5 w-1.5 rounded-full", status.dotColor)} />
                      <span className={cn("text-xs font-medium", status.textColor)}>
                        {status.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{device.lastSeen}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
