"use client"

import { type CSSProperties, FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, UserRound } from "lucide-react"
import { toast } from "sonner"
import { loginWithCredentials, hasAuthSession } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LRLogoMark } from "@/components/brand/lr-logo-mark"
import { useI18n } from "@/lib/i18n/context"
import { authDict } from "@/lib/i18n/pages/auth"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, toggleLocale } = useI18n()
  const tr = authDict[locale]
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next")
    if (!raw) return "/"
    if (!raw.startsWith("/")) return "/"
    return raw
  }, [searchParams])

  useEffect(() => {
    if (!hasAuthSession()) return
    router.replace(nextPath)
  }, [nextPath, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!identifier.trim()) {
      setError(tr.identifierRequired)
      return
    }
    // If the identifier looks like an email, validate its format
    if (identifier.includes("@") && !EMAIL_RE.test(identifier.trim())) {
      setError(tr.emailInvalid)
      return
    }
    if (!password.trim()) {
      setError(tr.passwordRequired)
      return
    }

    setSubmitting(true)
    try {
      await loginWithCredentials(identifier.trim(), password)
      toast.success(tr.loginSuccess)
      router.replace(nextPath)
    } catch (err) {
      const detail =
        err instanceof Error && err.message === "EMPLOYEE_ONLY_ACCOUNT"
          ? tr.employeeOnlyAccount
          : err instanceof Error
            ? err.message
            : tr.loginError
      setError(detail)
      setFailCount((n) => n + 1)
      toast.error(tr.loginFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="black-orange-theme auth-vector-stage relative min-h-screen overflow-hidden bg-background"
      style={
        {
          "--pointer-x": `${pointer.x}%`,
          "--pointer-y": `${pointer.y}%`,
        } as CSSProperties
      }
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPointer({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        })
      }}
    >
      <div className="auth-vector-grid" />
      <div className="auth-vector-orbit auth-vector-orbit-a" />
      <div className="auth-vector-orbit auth-vector-orbit-b" />
      <div className="auth-vector-beam auth-vector-beam-a" />
      <div className="auth-vector-beam auth-vector-beam-b" />
      <div className="auth-vector-cursor" />
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={tr.localeToggleAria}
        className="absolute right-4 top-4 z-10 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {locale === "fr" ? "EN" : "FR"}
      </button>
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
        <Card className="w-full border-orange-400/45 bg-card/88 backdrop-blur-md">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <LRLogoMark className="h-10 w-11 text-[18px]" />
              <div>
                <CardTitle className="text-lg">{tr.brand}</CardTitle>
                <CardDescription>{tr.loginSubtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="identifier">{tr.identifierLabel}</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="pl-9"
                    placeholder={tr.identifierPlaceholder}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{tr.passwordLabel}</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={tr.passwordPlaceholder}
                  autoComplete="current-password"
                />
                <div className="flex items-center justify-between">
                  {failCount >= 2 ? (
                    <p className="text-xs text-amber-400">{tr.multipleFailures}</p>
                  ) : <span />}
                  <Link href="/auth/forgot-password" className="ml-auto text-xs text-primary hover:underline">
                    {tr.forgotPassword}
                  </Link>
                </div>
              </div>
              {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tr.signIn}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {tr.noAccount}{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  {tr.createAccount}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
