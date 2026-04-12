"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export function DemoBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const apiEnabled = process.env.NEXT_PUBLIC_EMPLOYEE_API_ENABLED === "true"
    const apiBase = (process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "").trim()
    const isLocalhost = !apiBase || apiBase.includes("localhost") || apiBase.includes("127.0.0.1")
    setShow(!apiEnabled || isLocalhost)
  }, [])

  if (!show) return null

  return (
    <div className="demo-banner">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
      <span>
        Mode demonstration — les donnees affichees sont fictives.{" "}
        <Link href="/settings?tab=hikcentral" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
          Configurer HikCentral
        </Link>{" "}
        pour activer les donnees reelles.
      </span>
    </div>
  )
}
