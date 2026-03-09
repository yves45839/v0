"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  FileText,
  Calendar,
  Clock,
  Users,
  DoorOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Mail,
  Printer,
} from "lucide-react"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  Legend,
} from "recharts"

// Mock data for charts
const weeklyAttendanceData = [
  { day: "Lun", present: 245, absent: 11, late: 8 },
  { day: "Mar", present: 252, absent: 4, late: 12 },
  { day: "Mer", present: 248, absent: 8, late: 6 },
  { day: "Jeu", present: 251, absent: 5, late: 9 },
  { day: "Ven", present: 234, absent: 22, late: 5 },
]

const monthlyTrendData = [
  { month: "Jan", attendance: 94.2 },
  { month: "Fev", attendance: 95.1 },
  { month: "Mar", attendance: 93.8 },
  { month: "Avr", attendance: 96.2 },
  { month: "Mai", attendance: 95.7 },
  { month: "Juin", attendance: 94.9 },
]

const departmentData = [
  { name: "Engineering", value: 52, color: "#10b981" },
  { name: "Marketing", value: 28, color: "#3b82f6" },
  { name: "Sales", value: 35, color: "#f59e0b" },
  { name: "HR", value: 12, color: "#8b5cf6" },
  { name: "Finance", value: 18, color: "#ef4444" },
  { name: "Design", value: 15, color: "#06b6d4" },
]

const accessByHourData = [
  { hour: "06h", count: 12 },
  { hour: "07h", count: 45 },
  { hour: "08h", count: 156 },
  { hour: "09h", count: 89 },
  { hour: "10h", count: 34 },
  { hour: "11h", count: 28 },
  { hour: "12h", count: 67 },
  { hour: "13h", count: 72 },
  { hour: "14h", count: 31 },
  { hour: "15h", count: 25 },
  { hour: "16h", count: 19 },
  { hour: "17h", count: 98 },
  { hour: "18h", count: 134 },
  { hour: "19h", count: 45 },
]

const chartConfig = {
  present: {
    label: "Present",
    color: "#10b981",
  },
  absent: {
    label: "Absent",
    color: "#ef4444",
  },
  late: {
    label: "Retard",
    color: "#f59e0b",
  },
  attendance: {
    label: "Taux",
    color: "#10b981",
  },
  count: {
    label: "Acces",
    color: "#3b82f6",
  },
} satisfies ChartConfig

const reportTemplates = [
  {
    id: "attendance-daily",
    name: "Rapport de Presence Quotidien",
    description: "Liste des presences et absences du jour",
    icon: Calendar,
    category: "Presence",
  },
  {
    id: "attendance-weekly",
    name: "Rapport de Presence Hebdomadaire",
    description: "Synthese des presences de la semaine",
    icon: BarChart3,
    category: "Presence",
  },
  {
    id: "attendance-monthly",
    name: "Rapport de Presence Mensuel",
    description: "Statistiques mensuelles de presence",
    icon: TrendingUp,
    category: "Presence",
  },
  {
    id: "access-logs",
    name: "Journal des Acces",
    description: "Historique complet des evenements d'acces",
    icon: DoorOpen,
    category: "Acces",
  },
  {
    id: "denied-access",
    name: "Acces Refuses",
    description: "Liste des tentatives d'acces non autorisees",
    icon: AlertTriangle,
    category: "Acces",
  },
  {
    id: "late-arrivals",
    name: "Retards",
    description: "Liste des employes en retard",
    icon: Clock,
    category: "Presence",
  },
  {
    id: "department-stats",
    name: "Statistiques par Departement",
    description: "Analyse de presence par departement",
    icon: Users,
    category: "Analyse",
  },
  {
    id: "device-activity",
    name: "Activite des Appareils",
    description: "Statistiques d'utilisation des controleurs",
    icon: PieChart,
    category: "Systeme",
  },
]

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [selectedDepartment, setSelectedDepartment] = useState("all")

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Rapports</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Analyses et statistiques de presence et d&apos;acces
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les departements</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taux de Presence</p>
                    <p className="text-2xl font-semibold text-foreground">95.7%</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-sm font-medium">+2.3%</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">vs semaine derniere</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Absences</p>
                    <p className="text-2xl font-semibold text-foreground">11</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-sm font-medium">-5</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">vs semaine derniere</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Retards</p>
                    <p className="text-2xl font-semibold text-foreground">8</p>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-sm font-medium">+3</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">vs semaine derniere</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Acces Refuses</p>
                    <p className="text-2xl font-semibold text-foreground">3</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-sm font-medium">-2</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">vs semaine derniere</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList>
              <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
              <TabsTrigger value="templates">Modeles de rapport</TabsTrigger>
              <TabsTrigger value="scheduled">Rapports programmes</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {/* Charts Row 1 */}
              <div className="grid gap-6 xl:grid-cols-2">
                {/* Weekly Attendance Chart */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-base">Presence Hebdomadaire</CardTitle>
                    <CardDescription>
                      Repartition des presences, absences et retards
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <BarChart data={weeklyAttendanceData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Monthly Trend Chart */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-base">Tendance Mensuelle</CardTitle>
                    <CardDescription>Evolution du taux de presence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <LineChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={12}
                          domain={[90, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: "#10b981", r: 4 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid gap-6 xl:grid-cols-2">
                {/* Department Distribution */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-base">Repartition par Departement</CardTitle>
                    <CardDescription>Nombre d&apos;employes par departement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={departmentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {departmentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend
                            formatter={(value) => (
                              <span className="text-sm text-muted-foreground">{value}</span>
                            )}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Access by Hour */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-base">Acces par Heure</CardTitle>
                    <CardDescription>
                      Distribution des acces au cours de la journee
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <BarChart data={accessByHourData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {reportTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <template.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{template.name}</h3>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Excel
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <FileText className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Rapports Programmes</CardTitle>
                      <CardDescription>
                        Configurez l&apos;envoi automatique de rapports
                      </CardDescription>
                    </div>
                    <Button size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      Nouveau rapport programme
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Scheduled Report 1 */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">
                            Rapport Hebdomadaire de Presence
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Chaque lundi a 8h00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">3 destinataires</span>
                        </div>
                        <Badge className="bg-green-500/10 text-green-500">Actif</Badge>
                      </div>
                    </div>

                    {/* Scheduled Report 2 */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <AlertTriangle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">Alertes Acces Refuses</h4>
                          <p className="text-sm text-muted-foreground">
                            Quotidien a 18h00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">1 destinataire</span>
                        </div>
                        <Badge className="bg-green-500/10 text-green-500">Actif</Badge>
                      </div>
                    </div>

                    {/* Scheduled Report 3 */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">Rapport Mensuel Complet</h4>
                          <p className="text-sm text-muted-foreground">
                            Premier jour du mois a 9h00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Printer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Impression auto</span>
                        </div>
                        <Badge variant="secondary">Pause</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
