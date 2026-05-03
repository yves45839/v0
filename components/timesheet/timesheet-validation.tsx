"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"
import { AiSuggestionBanner } from "@/components/timesheet/ai-suggestion-banner"
import {
  TimesheetRow,
  type TimesheetItem,
} from "@/components/timesheet/timesheet-row"
import { cn } from "@/lib/utils"

const DEFAULT_ITEMS: TimesheetItem[] = [
  {
    id: 1,
    name: "Salim Ouhmane",
    initials: "SO",
    avatarColor: "oklch(0.6 0.13 25)",
    dateFr: "Ven. 30 avr.",
    dateEn: "Fri Apr 30",
    reasonFr: "Arrivée tardive · Caméra #2 · 06:24",
    reasonEn: "Late arrival · Camera #2 · 06:24",
    expectStart: "06:00",
    expectEnd: "14:00",
    actualStart: "06:24",
    actualEnd: "14:05",
    delta: "+24 min",
    deltaType: "warn",
    severity: "warn",
  },
  {
    id: 2,
    name: "Aïcha Diop",
    initials: "AD",
    avatarColor: "oklch(0.5 0.12 305)",
    dateFr: "Ven. 30 avr.",
    dateEn: "Fri Apr 30",
    reasonFr: "Pas de pointage de sortie · clôture auto en fin de quart",
    reasonEn: "No clock-out detected · auto-closed at shift end",
    expectStart: "08:00",
    expectEnd: "16:00",
    actualStart: "07:58",
    actualEnd: "—",
    delta: "manquant",
    deltaType: "danger",
    severity: "danger",
  },
  {
    id: 3,
    name: "Karim Benhaddou",
    initials: "KB",
    avatarColor: "oklch(0.55 0.13 220)",
    dateFr: "Jeu. 29 avr.",
    dateEn: "Thu Apr 29",
    reasonFr: "Heures sup. prolongées · +42 min",
    reasonEn: "Extended overtime · +42 min",
    expectStart: "22:00",
    expectEnd: "06:00",
    actualStart: "22:00",
    actualEnd: "06:42",
    delta: "+42 min",
    deltaType: "info",
    severity: "info",
  },
  {
    id: 4,
    name: "N'Guessan Anderson",
    initials: "NA",
    avatarColor: "oklch(0.5 0.11 165)",
    dateFr: "Jeu. 29 avr.",
    dateEn: "Thu Apr 29",
    reasonFr: "Pause longue · 1h42 au lieu de 1h",
    reasonEn: "Long break · 1h42 instead of 1h",
    expectStart: "14:00",
    expectEnd: "22:00",
    actualStart: "14:00",
    actualEnd: "22:00",
    delta: "+42 min",
    deltaType: "warn",
    severity: "warn",
  },
  {
    id: 5,
    name: "Yasmina El Bahri",
    initials: "YE",
    avatarColor: "oklch(0.55 0.12 280)",
    dateFr: "Mer. 28 avr.",
    dateEn: "Wed Apr 28",
    reasonFr: "Sortie anticipée · −18 min",
    reasonEn: "Early clock-out · −18 min",
    expectStart: "08:30",
    expectEnd: "17:30",
    actualStart: "08:30",
    actualEnd: "17:12",
    delta: "−18 min",
    deltaType: "warn",
    severity: "warn",
  },
]

type Tab = "anomalies" | "auto" | "all"

export function TimesheetValidation() {
  const { locale } = useI18n()
  const [items, setItems] = useState<TimesheetItem[]>(DEFAULT_ITEMS)
  const [selected, setSelected] = useState<Set<TimesheetItem["id"]>>(new Set())
  const [tab, setTab] = useState<Tab>("anomalies")

  const counts = useMemo(
    () => ({ anomalies: items.length, auto: 183, all: items.length + 183 }),
    [items.length],
  )

  const visibleItems = tab === "anomalies" ? items : []

  const toggle = (id: TimesheetItem["id"]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeIds = (ids: TimesheetItem["id"][]) => {
    setItems((prev) => prev.filter((it) => !ids.includes(it.id)))
    setSelected(new Set())
  }

  const approve = (id: TimesheetItem["id"]) => {
    removeIds([id])
    toast.success(
      locale === "en" ? "Anomaly approved" : "Anomalie validée",
    )
  }

  const reject = (id: TimesheetItem["id"]) => {
    removeIds([id])
    toast.error(locale === "en" ? "Anomaly rejected" : "Anomalie rejetée")
  }

  const edit = (id: TimesheetItem["id"]) => {
    toast.message(
      locale === "en" ? "Edit not implemented yet" : "Modification à venir",
      {
        description: String(id),
      },
    )
  }

  const approveAll = () => {
    const target =
      selected.size > 0
        ? Array.from(selected)
        : visibleItems.map((it) => it.id)
    if (target.length === 0) return
    removeIds(target)
    toast.success(
      locale === "en"
        ? `${target.length} anomalies approved`
        : `${target.length} anomalies validées`,
    )
  }

  const allSelected =
    visibleItems.length > 0 &&
    visibleItems.every((it) => selected.has(it.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visibleItems.map((it) => it.id)))
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: "anomalies",
      label: locale === "en" ? "Anomalies" : "Anomalies",
      count: counts.anomalies,
    },
    {
      key: "auto",
      label: locale === "en" ? "Auto-validated" : "Auto-validés",
      count: counts.auto,
    },
    { key: "all", label: locale === "en" ? "All" : "Tous", count: counts.all },
  ]

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "en" ? "Timesheet validation" : "Validation pointages"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "en"
              ? `${counts.anomalies} anomalies require validation across the last 7 days`
              : `${counts.anomalies} anomalies à valider sur les 7 derniers jours`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Export" : "Exporter"}
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={approveAll}
            disabled={visibleItems.length === 0}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Approve all" : "Tout valider"} (
            {selected.size > 0 ? selected.size : visibleItems.length})
          </Button>
        </div>
      </header>

      <AiSuggestionBanner matchedCount={3} totalCount={counts.anomalies} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit items-center gap-0 overflow-hidden rounded-lg border border-border/70 bg-card">
          {tabs.map((tabDef) => (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => setTab(tabDef.key)}
              className={cn(
                "px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === tabDef.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tabDef.label}
              <span className="ml-1 opacity-60">{tabDef.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{locale === "en" ? "Last 7 days" : "7 derniers jours"}</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {visibleItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleAll}
            className="font-medium text-foreground hover:underline"
          >
            {allSelected
              ? locale === "en"
                ? "Clear selection"
                : "Tout désélectionner"
              : locale === "en"
                ? "Select all"
                : "Tout sélectionner"}
          </button>
          {selected.size > 0 && (
            <>
              <span>·</span>
              <span>
                {locale === "en"
                  ? `${selected.size} selected`
                  : `${selected.size} sélectionnée(s)`}
              </span>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">
              {tab === "anomalies"
                ? locale === "en"
                  ? "No anomalies — everything is clean."
                  : "Aucune anomalie — tout est propre."
                : locale === "en"
                  ? "No data on this tab yet."
                  : "Aucune donnée sur cet onglet."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {locale === "en"
                ? "Pointing data is auto-validated when within tolerance."
                : "Les pointages dans la tolérance sont validés automatiquement."}
            </p>
          </div>
        ) : (
          visibleItems.map((it) => (
            <TimesheetRow
              key={it.id}
              item={it}
              selected={selected.has(it.id)}
              onToggleSelect={() => toggle(it.id)}
              onApprove={() => approve(it.id)}
              onReject={() => reject(it.id)}
              onEdit={() => edit(it.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
