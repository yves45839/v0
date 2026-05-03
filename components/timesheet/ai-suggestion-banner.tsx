"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"

interface AiSuggestionBannerProps {
  matchedCount: number
  totalCount: number
  onReview?: () => void
}

export function AiSuggestionBanner({
  matchedCount,
  totalCount,
  onReview,
}: AiSuggestionBannerProps) {
  const { locale } = useI18n()

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        background: "color-mix(in oklab, var(--warning) 14%, var(--card))",
        borderColor: "color-mix(in oklab, var(--warning) 35%, transparent)",
      }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: "var(--warning)" }}
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {locale === "en"
            ? `AI suggestion: ${matchedCount} of ${totalCount} anomalies match a recurring pattern`
            : `Suggestion IA : ${matchedCount} des ${totalCount} anomalies suivent un schéma récurrent`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {locale === "en"
            ? "Late arrivals on Fridays for SO and KB during the last 4 weeks. Suggest adjusting shift start by 15 min."
            : "Arrivées tardives le vendredi pour SO et KB sur les 4 dernières semaines. Décaler le début de quart de 15 min ?"}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 flex-shrink-0"
        onClick={onReview}
      >
        {locale === "en" ? "Review pattern" : "Voir l'analyse"}
      </Button>
    </div>
  )
}
