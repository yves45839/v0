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
import { Activity, TrendingUp, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Flux d'acces en temps reel
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary" asChild>
            <Link href="/access-logs">
              Voir tout
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
          <Badge variant="outline" className="border-primary/50 text-primary">
            <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
            En direct
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="mb-4 grid w-full max-w-64 grid-cols-2 bg-secondary/70 sm:max-w-xs">
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
            <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/35">
              {events.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Activity className="mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">Aucun événement aujourd&apos;hui</p>
                  <p className="text-xs text-muted-foreground/60">Les accès apparaîtront ici en temps réel</p>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Employe</TableHead>
                    <TableHead className="text-muted-foreground">Departement</TableHead>
                    <TableHead className="text-muted-foreground">Appareil</TableHead>
                    <TableHead className="text-muted-foreground">Statut</TableHead>
                    <TableHead className="text-right text-muted-foreground">Heure</TableHead>
                    <TableHead className="text-right text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      className="group border-border transition-colors hover:bg-secondary/45"
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
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link href={`/access-logs?person=${encodeURIComponent(event.employeeId)}&status=${event.status}`}>
                            Analyser
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <div className="rounded-xl border border-border/70 bg-background/35 p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Résumé des tendances</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-card/80 p-4 text-center">
                  <p className="text-2xl font-bold text-primary tabular-nums">{events.filter(e => e.status === "granted").length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Accès autorisés</p>
                  <Button variant="link" size="sm" className="mt-1 h-6 px-0 text-xs" asChild>
                    <Link href="/access-logs?status=granted&date=today">Voir le detail</Link>
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/80 p-4 text-center">
                  <p className="text-2xl font-bold text-destructive tabular-nums">{events.filter(e => e.status === "denied").length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Accès refusés</p>
                  <Button variant="link" size="sm" className="mt-1 h-6 px-0 text-xs" asChild>
                    <Link href="/access-logs?status=denied&date=today">Diagnostiquer</Link>
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/80 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{new Set(events.map(e => e.department)).size}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Départements actifs</p>
                  <Button variant="link" size="sm" className="mt-1 h-6 px-0 text-xs" asChild>
                    <Link href="/employees?focus=organization">Explorer</Link>
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Statistiques basées sur les {events.length} derniers événements du jour
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
