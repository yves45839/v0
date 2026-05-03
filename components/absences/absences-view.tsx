"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import {
  AbsenceRequestCard,
  type AbsenceRequest,
} from "@/components/absences/absence-request-card"
import { TeamAvailability } from "@/components/absences/team-availability"

const DEFAULT_REQUESTS: AbsenceRequest[] = [
  {
    id: 1,
    name: "Salim Ouhmane",
    initials: "SO",
    avatarColor: "oklch(0.6 0.13 25)",
    kind: "paid",
    fromDate: "06/05",
    toDate: "10/05",
    days: 5,
    requestedFr: "il y a 3 jours",
    requestedEn: "3 days ago",
    reasonFr: "Événement familial à Marrakech",
    reasonEn: "Family event in Marrakech",
    conflict: false,
    balanceUsed: 7,
    balanceTotal: 25,
  },
  {
    id: 2,
    name: "Yasmina El Bahri",
    initials: "YE",
    avatarColor: "oklch(0.55 0.12 280)",
    kind: "paid",
    fromDate: "06/05",
    toDate: "08/05",
    days: 3,
    requestedFr: "hier",
    requestedEn: "yesterday",
    reasonFr: "Affaires personnelles",
    reasonEn: "Personal matters",
    conflict: true,
    balanceUsed: 12,
    balanceTotal: 25,
  },
  {
    id: 3,
    name: "Karim Benhaddou",
    initials: "KB",
    avatarColor: "oklch(0.55 0.13 220)",
    kind: "sick",
    fromDate: "30/04",
    toDate: "02/05",
    days: 3,
    requestedFr: "ce matin",
    requestedEn: "this morning",
    reasonFr: "Certificat médical joint",
    reasonEn: "Medical certificate attached",
    conflict: false,
    balanceUsed: 4,
    balanceTotal: 25,
  },
]

type Tab = "pending" | "approved" | "refused" | "all"

export function AbsencesView() {
  const { locale } = useI18n()
  const [requests, setRequests] = useState<AbsenceRequest[]>(DEFAULT_REQUESTS)
  const [selectedId, setSelectedId] = useState<AbsenceRequest["id"] | null>(2)
  const [tab, setTab] = useState<Tab>("pending")

  const counts = { pending: requests.length, approved: 27, refused: 2, all: requests.length + 29 }
  const visibleRequests = tab === "pending" ? requests : []

  const remove = (id: AbsenceRequest["id"]) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const approve = (id: AbsenceRequest["id"]) => {
    remove(id)
    toast.success(locale === "en" ? "Request approved" : "Demande validée")
  }
  const reject = (id: AbsenceRequest["id"]) => {
    remove(id)
    toast.error(locale === "en" ? "Request rejected" : "Demande rejetée")
  }
  const discuss = (id: AbsenceRequest["id"]) => {
    toast.message(
      locale === "en" ? "Discussion thread coming soon" : "Discussion à venir",
      { description: String(id) },
    )
  }
  const newRequest = () => {
    toast.message(
      locale === "en"
        ? "Manual leave creation form coming soon"
        : "Création manuelle de congé à venir",
    )
  }

  const tabs: { key: Tab; labelFr: string; labelEn: string; count: number }[] = [
    { key: "pending", labelFr: "En attente", labelEn: "Pending", count: counts.pending },
    { key: "approved", labelFr: "Validées", labelEn: "Approved", count: counts.approved },
    { key: "refused", labelFr: "Refusées", labelEn: "Refused", count: counts.refused },
    { key: "all", labelFr: "Toutes", labelEn: "All", count: counts.all },
  ]

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "en" ? "Time off requests" : "Demandes de congés"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "en"
              ? `${counts.pending} pending requests · 4 people on leave today`
              : `${counts.pending} demandes en attente · 4 personnes en congé aujourd'hui`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            {locale === "en" ? "Leave policy" : "Règles de congé"}
          </Button>
          <Button size="sm" className="h-9" onClick={newRequest}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "New request" : "Nouvelle demande"}
          </Button>
        </div>
      </header>

      <div className="inline-flex w-fit items-center gap-1 overflow-hidden rounded-lg border border-border/70 bg-card p-0.5">
        {tabs.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => setTab(tabDef.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === tabDef.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {locale === "en" ? tabDef.labelEn : tabDef.labelFr}
            <span className="ml-1 opacity-60">{tabDef.count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {visibleRequests.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                {locale === "en" ? "Nothing to review here." : "Rien à examiner ici."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === "en"
                  ? "Switch to the Pending tab to see the active queue."
                  : "Passez à l'onglet En attente pour voir la file active."}
              </p>
            </div>
          ) : (
            visibleRequests.map((r) => (
              <AbsenceRequestCard
                key={r.id}
                request={r}
                selected={selectedId === r.id}
                onSelect={() => setSelectedId(r.id)}
                onApprove={() => approve(r.id)}
                onReject={() => reject(r.id)}
                onDiscuss={() => discuss(r.id)}
              />
            ))
          )}
        </div>
        <TeamAvailability />
      </div>
    </div>
  )
}
