"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import type { Employee } from "@/app/employees/page"

type EmployeeDrawerProps = {
  employee: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeDrawer({ employee, open, onOpenChange }: EmployeeDrawerProps) {
  if (!employee) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarFallback className="bg-secondary text-lg font-semibold text-foreground">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{employee.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
              <Badge
                variant="secondary"
                className="mt-2 bg-primary/10 text-primary"
              >
                {employee.department}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              General
            </TabsTrigger>
            <TabsTrigger value="access" className="flex-1">
              Acces
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              Historique
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Informations de Contact
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{employee.phone}</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    Embauche le {new Date(employee.hireDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Statut de Synchronisation
              </h3>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                {employee.syncStatus === "synced" && (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Synchronise avec HikCentral
                    </span>
                  </>
                )}
                {employee.syncStatus === "pending" && (
                  <>
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="text-sm font-medium text-warning">
                      En attente de synchronisation
                    </span>
                  </>
                )}
                {employee.syncStatus === "error" && (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      Erreur de synchronisation
                    </span>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Access Tab */}
          <TabsContent value="access" className="mt-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Carte d&apos;Acces
              </h3>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm text-foreground">
                  {employee.cardNumber}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Groupes d&apos;Acces
              </h3>
              <div className="flex flex-wrap gap-2">
                {employee.accessGroups.map((group) => (
                  <Badge key={group} variant="secondary">
                    {group}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Donnees Biometriques
              </h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <span className="text-sm text-foreground">Photo Faciale</span>
                  {employee.biometricStatus.hasFacePhoto ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Enregistree
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Manquante
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Upload className="mr-1 h-3 w-3" />
                        Uploader
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <span className="text-sm text-foreground">Empreinte Digitale</span>
                  {employee.biometricStatus.hasFingerprint ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Enregistree
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Manquante
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                5 Derniers Acces
              </h3>
              <div className="space-y-2">
                {employee.accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          log.status === "granted" ? "bg-primary" : "bg-destructive"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {log.device}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.status === "granted" ? "Acces accorde" : "Acces refuse"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Dernier Acces
              </h3>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm text-foreground">{employee.lastAccess}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
