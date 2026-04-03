"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Cpu, DoorOpen, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Device } from "@/components/dashboard/types"

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
  const sortedDevices = [...devices].sort((left, right) => {
    const severity = { offline: 0, warning: 1, online: 2 } as const
    return severity[left.status] - severity[right.status] || left.name.localeCompare(right.name)
  })
  const onlineCount = devices.filter((d) => d.status === "online").length
  const offlineCount = devices.filter((d) => d.status === "offline").length
  const warningCount = devices.filter((d) => d.status === "warning").length

  return (
    <Card className="h-full border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Sante des appareils
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Controleurs et lecteurs Hikvision</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pb-2">
        {/* Summary */}
        <div className="mb-4 flex gap-4 rounded-lg bg-secondary/50 p-3">
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
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-card-foreground">{warningCount}</span> A surveiller
            </span>
          </div>
        </div>

        {/* Device List */}
        <ScrollArea className="h-80">
          <div className="space-y-2 pr-4">
            {sortedDevices.map((device) => {
              const Icon = deviceTypeIcons[device.type]
              const status = statusConfig[device.status]

              return (
                <div
                  key={device.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-secondary/50",
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
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
