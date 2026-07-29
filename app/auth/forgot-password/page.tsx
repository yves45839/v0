"use client"

import Link from "next/link"
import { type CSSProperties, FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { requestPasswordReset, type PasswordResetRequestResponse } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LRLogoMark } from "@/components/brand/lr-logo-mark"
import { useI18n } from "@/lib/i18n/context"
import { authDict } from "@/lib/i18n/pages/auth"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const { locale, formatDateTime } = useI18n()
  const tr = authDict[locale]
  const [identifier, setIdentifier] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [resetResponse, setResetResponse] = useState<PasswordResetRequestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!identifier.trim()) {
      setError(tr.forgotIdentifierRequired)
      return
    }
    if (identifier.includes("@") && !EMAIL_RE.test(identifier.trim())) {
      setError(tr.emailInvalid)
      return
    }

    setSubmitting(true)
    try {
      const response = await requestPasswordReset(identifier.trim())
      setResetResponse(response)
      toast.success(tr.requestSentToast)
    } catch (err) {
      const detail = err instanceof Error ? err.message : tr.requestError
      setError(detail)
      toast.error(tr.requestFailedToast)
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
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
        <Card className="w-full border-orange-400/45 bg-card/88 backdrop-blur-md">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <LRLogoMark className="h-10 w-11 text-[18px]" />
              <div>
                <CardTitle className="text-lg">{tr.brand}</CardTitle>
                <CardDescription>{tr.forgotTitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetResponse ? (
              <div className="space-y-3 text-sm">
                <p className="text-foreground">
                  {resetResponse.email_sent ? tr.resetEmailSent : tr.resetOtpGenerated}
                </p>
                {resetResponse.expires_at ? (
                  <p className="text-xs text-muted-foreground">
                    {tr.validUntil}{" "}
                    <span className="font-medium text-foreground">
                      {formatDateTime(resetResponse.expires_at)}
                    </span>
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 pt-1">
                  <Button asChild variant="outline">
                    <Link href="/login">{tr.backToLogin}</Link>
                  </Button>
                  <Button asChild variant="ghost" className="text-xs">
                    <Link href="/auth/reset-password">{tr.haveCodeOrToken}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="identifier">{tr.identifierLabel}</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder={tr.identifierPlaceholder}
                    autoComplete="username"
                  />
                </div>
                {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.sendResetLink}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline">
                    {tr.backToLogin}
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
