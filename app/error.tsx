"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Une erreur est survenue</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Une erreur inattendue s'est produite. Veuillez réessayer."}
        </p>
        <Button onClick={reset} className="mt-2">
          Réessayer
        </Button>
      </div>
    </div>
  )
}
