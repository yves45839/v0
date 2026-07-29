"use client"

import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { shellDict } from "@/lib/i18n/pages/shell"

interface InfoTooltipProps {
  content: string
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

export function InfoTooltip({ content, side = "top", className }: InfoTooltipProps) {
  const { locale } = useI18n()
  const tr = shellDict[locale]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={tr.moreInfo}
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-64 text-center text-[11px] leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
