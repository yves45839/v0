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
import { toast } from "sonner"
import type { Employee } from "@/app/employees/page"

type EmployeeDrawerProps = {
  employee: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestFacePhotoUpload?: (employee: Employee) => void
}

export function EmployeeDrawer({
  employee,
  open,
  onOpenChange,
  onRequestFacePhotoUpload,
}: EmployeeDrawerProps) {
  if (!employee) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <AvatarFallback className="bg-secondary/80 text-base font-semibold text-foreground">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-bold">{employee.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
              <Badge variant="secondary" className="mt-1.5 bg-primary/8 text-primary">
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

          <TabsContent value="general" className="mt-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contact
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                  <Mail className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-sm text-foreground">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                  <Phone className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-sm text-foreground">{employee.phone}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-sm text-foreground">
                    Embauche le {new Date(employee.hireDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Synchronisation
              </h3>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                {employee.syncStatus === "synced" && (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Synchronise</span>
                  </>
                )}
                {employee.syncStatus === "pending" && (
                  <>
                    <Clock className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">En attente</span>
                  </>
                )}
                {employee.syncStatus === "error" && (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Erreur</span>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Carte d&apos;acces
              </h3>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                <CreditCard className="h-4 w-4 text-muted-foreground/70" />
                <span className="font-mono text-sm tabular-nums text-foreground">{employee.cardNumber}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Groupes d&apos;acces
              </h3>
              <div className="flex flex-wrap gap-2">
                {employee.accessGroups.map((group) => (
                  <Badge key={group} variant="secondary" className="text-[11px]">
                    {group}
                  </Badge>
                ))}
                {employee.accessGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun groupe affecte.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Biometrie
              </h3>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/80 p-3">
                  <span className="text-sm text-foreground">Photo faciale</span>
                  {employee.biometricStatus.hasFacePhoto ? (
                    <Badge variant="secondary" className="bg-emerald-500/8 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      OK
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-destructive/8 text-destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Manquante
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg text-[11px]"
                        onClick={() => {
                          if (onRequestFacePhotoUpload) {
                            onRequestFacePhotoUpload(employee)
                            return
                          }
                          toast.info("Upload photo", {
                            description: "Utilisez le formulaire d'edition pour ajouter une photo faciale.",
                          })
                        }}
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        Upload
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/80 p-3">
                  <span className="text-sm text-foreground">Empreinte digitale</span>
                  {employee.biometricStatus.hasFingerprint ? (
                    <Badge variant="secondary" className="bg-emerald-500/8 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-destructive/8 text-destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Manquante
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Derniers acces
              </h3>
              <div className="space-y-2">
                {employee.accessLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun acces enregistre.</p>
                )}
                {employee.accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card/80 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          log.status === "granted" ? "bg-emerald-400" : "bg-destructive"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.device}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.status === "granted" ? "Accorde" : "Refuse"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Dernier acces
              </h3>
              <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                <p className="text-sm text-foreground">{employee.lastAccess}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
