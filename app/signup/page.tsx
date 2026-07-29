"use client"

import Link from "next/link"
import { type CSSProperties, FormEvent, useMemo, useState } from "react"
import { Building2, Loader2, Mail, UserRound } from "lucide-react"
import { toast } from "sonner"
import { clientSignup } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordStrengthBar } from "@/components/ui/password-strength-bar"
import { LRLogoMark } from "@/components/brand/lr-logo-mark"
import { useI18n } from "@/lib/i18n/context"
import { authDict } from "@/lib/i18n/pages/auth"

type SubmitStatus = "idle" | "submitting" | "success"

export default function SignupPage() {
  const { locale, toggleLocale, formatDateTime } = useI18n()
  const tr = authDict[locale]
  const [tenantName, setTenantName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<string>("")
  const [emailSent, setEmailSent] = useState<boolean>(true)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })

  const canSubmit = useMemo(() => {
    if (status === "submitting") return false
    return Boolean(tenantName.trim() && email.trim() && password && confirmPassword)
  }, [confirmPassword, email, password, status, tenantName])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!tenantName.trim()) {
      setError(tr.tenantNameRequired)
      return
    }
    if (!email.trim()) {
      setError(tr.emailRequired)
      return
    }
    if (password.length < 8) {
      setError(tr.passwordTooShort)
      return
    }
    if (password !== confirmPassword) {
      setError(tr.passwordsDoNotMatch)
      return
    }

    setStatus("submitting")
    try {
      const response = await clientSignup({
        email: email.trim().toLowerCase(),
        password,
        tenant_name: tenantName.trim(),
        organization_name: organizationName.trim() || "Default Organization",
      })
      setVerificationExpiresAt(String(response.email_verification_expires_at ?? ""))
      setEmailSent(Boolean(response.email_sent))
      setStatus("success")
      toast.success(tr.signupSuccessToast)
    } catch (err) {
      const detail = err instanceof Error ? err.message : tr.signupError
      setError(detail)
      setStatus("idle")
      toast.error(tr.signupFailedToast)
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
                <CardDescription>{tr.signupSubtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {status === "success" ? (
              <div className="space-y-3 text-sm">
                <p>
                  {emailSent ? tr.signupRecordedEmailSent : tr.signupRecordedPending}
                </p>
                {verificationExpiresAt ? (
                  <p className="text-muted-foreground">{tr.linkExpires(formatDateTime(verificationExpiresAt))}</p>
                ) : null}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/verify-email">{tr.verifyWithOtpOrLink}</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/login">{tr.goToLogin}</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="tenantName">{tr.tenantNameLabel}</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tenantName"
                      value={tenantName}
                      onChange={(event) => setTenantName(event.target.value)}
                      className="pl-9"
                      placeholder={tr.tenantNamePlaceholder}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">{tr.organizationLabel}</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="organizationName"
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      className="pl-9"
                      placeholder={tr.organizationPlaceholder}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{tr.emailLabel}</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-9"
                      placeholder={tr.identifierPlaceholder}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{tr.passwordLabel}</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={tr.passwordMinPlaceholder}
                    autoComplete="new-password"
                  />
                  <PasswordStrengthBar password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{tr.confirmPasswordLabel}</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={tr.confirmPasswordPlaceholder}
                    autoComplete="new-password"
                  />
                </div>
                {error ? <p className="text-xs text-red-400">{error}</p> : null}
                <Button type="submit" disabled={!canSubmit} className="w-full">
                  {status === "submitting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.createMyAccount}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {tr.alreadyRegistered}{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    {tr.signIn}
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
