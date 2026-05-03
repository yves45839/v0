"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AUTH_EVENTS, hasAuthSession } from "@/lib/api/auth"

type AuthGuardProps = {
  children: React.ReactNode
}

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/auth/verify-email",
  "/auth/accept-invitation",
  "/auth/forgot-password",
  "/auth/reset-password",
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [sessionVersion, setSessionVersion] = useState(0)

  const publicPath = useMemo(() => isPublicPath(pathname), [pathname])
  const authenticated = useMemo(() => hasAuthSession(), [sessionVersion])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleSessionChange = () => setSessionVersion((value) => value + 1)
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("securepoint-auth-")) {
        setSessionVersion((value) => value + 1)
      }
    }
    window.addEventListener(AUTH_EVENTS.SESSION_CHANGED, handleSessionChange)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener(AUTH_EVENTS.SESSION_CHANGED, handleSessionChange)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  useEffect(() => {
    if (!mounted || publicPath || authenticated) {
      return
    }
    const nextPath = `${pathname}${window.location.search || ""}`
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
  }, [authenticated, mounted, pathname, publicPath, router])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement...
      </div>
    )
  }

  if (!publicPath && !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirection vers la connexion...
      </div>
    )
  }

  return <>{children}</>
}
