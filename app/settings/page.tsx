"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Server,
  Shield,
  Bell,
  Users,
  Clock,
  Globe,
  Key,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Building,
  DoorOpen,
  Fingerprint,
  Mail,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react"

type AccessGroup = {
  id: string
  name: string
  description: string
  deviceCount: number
  userCount: number
}

const accessGroups: AccessGroup[] = [
  {
    id: "grp-001",
    name: "Building A",
    description: "Acces general au batiment A",
    deviceCount: 4,
    userCount: 180,
  },
  {
    id: "grp-002",
    name: "Server Room",
    description: "Acces restreint - salle serveur",
    deviceCount: 1,
    userCount: 8,
  },
  {
    id: "grp-003",
    name: "Parking",
    description: "Acces au parking souterrain",
    deviceCount: 2,
    userCount: 150,
  },
  {
    id: "grp-004",
    name: "All Floors",
    description: "Acces a tous les etages",
    deviceCount: 8,
    userCount: 25,
  },
  {
    id: "grp-005",
    name: "Data Center",
    description: "Acces haute securite - Data Center",
    deviceCount: 1,
    userCount: 5,
  },
]

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [autoEnroll, setAutoEnroll] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [deniedAlerts, setDeniedAlerts] = useState(true)
  const [offlineAlerts, setOfflineAlerts] = useState(true)
  const [newGroupOpen, setNewGroupOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Parametres</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configuration du systeme et integration HikCentral
            </p>
          </div>

          <Tabs defaultValue="hikcentral" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="hikcentral">
                <Server className="mr-2 h-4 w-4" />
                HikCentral
              </TabsTrigger>
              <TabsTrigger value="access-groups">
                <DoorOpen className="mr-2 h-4 w-4" />
                Groupes d&apos;acces
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-2 h-4 w-4" />
                Securite
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="general">
                <Globe className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
            </TabsList>

            {/* HikCentral Integration Tab */}
            <TabsContent value="hikcentral" className="space-y-6">
              {/* Connection Status */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Etat de la Connexion</CardTitle>
                      <CardDescription>
                        Connexion au serveur HikCentral Professional
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connecte
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">HikCentral Professional v3.2.0</p>
                        <p className="text-sm text-muted-foreground">
                          hikcentral.company.local:8443
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Derniere sync</p>
                      <p className="text-sm font-medium">Il y a 2 minutes</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-3 text-center">
                      <p className="text-2xl font-semibold text-foreground">256</p>
                      <p className="text-sm text-muted-foreground">Employes syncronises</p>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-center">
                      <p className="text-2xl font-semibold text-foreground">12</p>
                      <p className="text-sm text-muted-foreground">Appareils connectes</p>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-center">
                      <p className="text-2xl font-semibold text-foreground">5</p>
                      <p className="text-sm text-muted-foreground">Groupes d&apos;acces</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Synchroniser maintenant
                    </Button>
                    <Button variant="outline">Tester la connexion</Button>
                  </div>
                </CardContent>
              </Card>

              {/* API Configuration */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Configuration API</CardTitle>
                  <CardDescription>
                    Parametres de connexion a l&apos;API HikCentral
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="server-url">URL du serveur</Label>
                      <Input
                        id="server-url"
                        defaultValue="https://hikcentral.company.local:8443"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-version">Version API</Label>
                      <Select defaultValue="v2">
                        <SelectTrigger id="api-version">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v1">API v1 (Legacy)</SelectItem>
                          <SelectItem value="v2">API v2 (Recommande)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">Cle API</Label>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? "text" : "password"}
                          defaultValue="hcp_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-secret">Secret API</Label>
                      <div className="relative">
                        <Input id="api-secret" type="password" defaultValue="••••••••••••" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>
                      <Key className="mr-2 h-4 w-4" />
                      Sauvegarder les identifiants
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sync Settings */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Parametres de Synchronisation</CardTitle>
                  <CardDescription>
                    Configuration de la synchronisation automatique
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCcw className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Synchronisation automatique</p>
                        <p className="text-sm text-muted-foreground">
                          Synchroniser les donnees toutes les 5 minutes
                        </p>
                      </div>
                    </div>
                    <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Enrolement automatique</p>
                        <p className="text-sm text-muted-foreground">
                          Creer automatiquement les employes dans HikCentral
                        </p>
                      </div>
                    </div>
                    <Switch checked={autoEnroll} onCheckedChange={setAutoEnroll} />
                  </div>

                  <div className="space-y-2">
                    <Label>Intervalle de synchronisation</Label>
                    <Select defaultValue="5">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Toutes les minutes</SelectItem>
                        <SelectItem value="5">Toutes les 5 minutes</SelectItem>
                        <SelectItem value="15">Toutes les 15 minutes</SelectItem>
                        <SelectItem value="30">Toutes les 30 minutes</SelectItem>
                        <SelectItem value="60">Toutes les heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Access Groups Tab */}
            <TabsContent value="access-groups" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Groupes d&apos;Acces</CardTitle>
                      <CardDescription>
                        Gerez les zones et permissions d&apos;acces
                      </CardDescription>
                    </div>
                    <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Nouveau groupe
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Creer un groupe d&apos;acces</DialogTitle>
                          <DialogDescription>
                            Definissez un nouveau groupe d&apos;acces avec ses appareils associes
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="group-name">Nom du groupe</Label>
                            <Input id="group-name" placeholder="ex: Bureau Direction" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="group-desc">Description</Label>
                            <Input
                              id="group-desc"
                              placeholder="Description du groupe d'acces"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Appareils associes</Label>
                            <div className="grid gap-2">
                              {["Main Entrance A", "Main Entrance B", "Floor 2 Access"].map(
                                (device) => (
                                  <label
                                    key={device}
                                    className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50"
                                  >
                                    <input type="checkbox" className="rounded" />
                                    <span className="text-sm">{device}</span>
                                  </label>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setNewGroupOpen(false)}>
                            Annuler
                          </Button>
                          <Button onClick={() => setNewGroupOpen(false)}>Creer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {accessGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{group.name}</h4>
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm font-medium">{group.deviceCount}</p>
                            <p className="text-xs text-muted-foreground">Appareils</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">{group.userCount}</p>
                            <p className="text-xs text-muted-foreground">Utilisateurs</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Authentification Biometrique</CardTitle>
                  <CardDescription>
                    Parametres de reconnaissance faciale et empreintes digitales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Reconnaissance faciale obligatoire</p>
                        <p className="text-sm text-muted-foreground">
                          Exiger une photo faciale pour tous les employes
                        </p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Double authentification (zones sensibles)</p>
                        <p className="text-sm text-muted-foreground">
                          Carte + biometrie pour Server Room et Data Center
                        </p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label>Seuil de confiance reconnaissance faciale</Label>
                    <Select defaultValue="85">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">70% (Faible)</SelectItem>
                        <SelectItem value="85">85% (Recommande)</SelectItem>
                        <SelectItem value="95">95% (Strict)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Politique d&apos;Acces</CardTitle>
                  <CardDescription>
                    Regles de controle d&apos;acces globales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Delai de verrouillage apres echecs</Label>
                      <Select defaultValue="3">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 tentatives</SelectItem>
                          <SelectItem value="5">5 tentatives</SelectItem>
                          <SelectItem value="10">10 tentatives</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duree du verrouillage</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 heure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Restriction horaire</p>
                        <p className="text-sm text-muted-foreground">
                          Limiter les acces en dehors des heures de bureau (6h-22h)
                        </p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Canaux de Notification</CardTitle>
                  <CardDescription>
                    Configurez comment recevoir les alertes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Notifications par email</p>
                        <p className="text-sm text-muted-foreground">
                          Recevoir les alertes par email
                        </p>
                      </div>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Notifications push</p>
                        <p className="text-sm text-muted-foreground">
                          Notifications sur l&apos;application mobile
                        </p>
                      </div>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Types d&apos;Alertes</CardTitle>
                  <CardDescription>
                    Selectionnez les evenements qui declenchent des notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">Acces refuses</p>
                        <p className="text-sm text-muted-foreground">
                          Alertes pour les tentatives d&apos;acces non autorisees
                        </p>
                      </div>
                    </div>
                    <Switch checked={deniedAlerts} onCheckedChange={setDeniedAlerts} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">Appareils hors ligne</p>
                        <p className="text-sm text-muted-foreground">
                          Alertes lorsqu&apos;un controleur perd la connexion
                        </p>
                      </div>
                    </div>
                    <Switch checked={offlineAlerts} onCheckedChange={setOfflineAlerts} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Biometrie manquante</p>
                        <p className="text-sm text-muted-foreground">
                          Rappel pour les employes sans photo faciale
                        </p>
                      </div>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCcw className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Echecs de synchronisation</p>
                        <p className="text-sm text-muted-foreground">
                          Alertes en cas d&apos;erreur de sync HikCentral
                        </p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Informations de l&apos;Entreprise</CardTitle>
                  <CardDescription>
                    Parametres generaux de votre organisation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nom de l&apos;entreprise</Label>
                      <Input id="company-name" defaultValue="TechCorp Industries" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuseau horaire</Label>
                      <Select defaultValue="europe-paris">
                        <SelectTrigger id="timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="europe-paris">Europe/Paris (UTC+1)</SelectItem>
                          <SelectItem value="europe-london">Europe/London (UTC)</SelectItem>
                          <SelectItem value="america-new-york">America/New_York (UTC-5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="work-start">Heure de debut de journee</Label>
                      <Input id="work-start" type="time" defaultValue="09:00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work-end">Heure de fin de journee</Label>
                      <Input id="work-end" type="time" defaultValue="18:00" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tolerance retard (minutes)</Label>
                    <Select defaultValue="15">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Langue et Format</CardTitle>
                  <CardDescription>
                    Preferences d&apos;affichage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Langue</Label>
                      <Select defaultValue="fr">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Francais</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Espanol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Format de date</Label>
                      <Select defaultValue="dd-mm-yyyy">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button>Sauvegarder les parametres</Button>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
