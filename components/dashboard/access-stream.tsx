"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Activity, TrendingUp } from "lucide-react"
import type { AccessEvent } from "@/components/dashboard/types"

interface AccessStreamProps {
  events: AccessEvent[]
}

function StatusDot({ status }: { status: "granted" | "denied" }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          status === "granted" ? "bg-primary" : "bg-destructive"
        )}
      />
      <span
        className={cn(
          "text-sm font-medium",
          status === "granted" ? "text-primary" : "text-destructive"
        )}
      >
        {status === "granted" ? "Acces autorise" : "Acces refuse"}
      </span>
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AccessStream({ events }: AccessStreamProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Flux d'acces en temps reel
          </CardTitle>
        </div>
        <Badge variant="outline" className="border-primary/50 text-primary">
          <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
          En direct
        </Badge>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="mb-4 grid w-full max-w-xs grid-cols-2 bg-secondary">
            <TabsTrigger
              value="daily"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Vue du jour
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Tendances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-0">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Employe</TableHead>
                    <TableHead className="text-muted-foreground">Departement</TableHead>
                    <TableHead className="text-muted-foreground">Appareil</TableHead>
                    <TableHead className="text-muted-foreground">Statut</TableHead>
                    <TableHead className="text-right text-muted-foreground">Heure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      className="group border-border transition-colors hover:bg-secondary/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={event.photo} alt={event.name} />
                            <AvatarFallback className="bg-secondary text-xs text-muted-foreground">
                              {getInitials(event.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-card-foreground">{event.name}</p>
                            <p className="text-xs text-muted-foreground">{event.employeeId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-secondary text-muted-foreground"
                        >
                          {event.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{event.deviceName}</TableCell>
                      <TableCell>
                        <StatusDot status={event.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {event.timestamp}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-secondary/50">
              <div className="text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Visualisation des tendances hebdomadaires
                </p>
                <p className="text-xs text-muted-foreground">Activation prochaine</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
