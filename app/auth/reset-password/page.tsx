"use client"

import Link from "next/link"
import { type CSSProperties, FormEvent, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { confirmPasswordReset } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { PasswordStrengthBar } from "@/components/ui/password-strength-bar"
import { LRLogoMark } from "@/components/brand/lr-logo-mark"
import { useI18n } from "@/lib/i18n/context"
import { authDict } from "@/lib/i18n/pages/auth"

/**
 * Conditional wizard:
 *  - If ?token= is present in the URL  →  "email link" flow: token + new password
 *  - Otherwise                          →  "OTP" flow: email + code + new password
 * The two flows are never shown at the same time.
 */
export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const { locale } = useI18n()
  const tr = authDict[locale]
  const tokenFromQuery = useMemo(() => String(searchParams.get("token") ?? "").trim(), [searchParams])

  // Detect the flow on mount — if a token is in the URL, use the link flow
  const [flow] = useState<"token" | "otp">(() => tokenFromQuery.length > 0 ? "token" : "otp")

  const [token, setToken] = useState(tokenFromQuery)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })

  const passwordMismatch = confirmTouched && confirmPassword.length > 0 && newPassword !== confirmPassword

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError(tr.newPasswordTooShort)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(tr.passwordsDoNotMatch)
      return
    }

    if (flow === "token" && !token.trim()) {
      setError(tr.tokenRequired)
      return
    }
    if (flow === "otp") {
      if (!email.trim()) { setError(tr.emailAddressRequired); return }
      if (otp.trim().length < 4) { setError(tr.otpIncomplete); return }
    }

    setSubmitting(true)
    try {
      await confirmPasswordReset(
        flow === "token"
          ? { token: token.trim(), new_password: newPassword }
          : { email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPassword }
      )
      setSuccess(true)
      toast.success(tr.passwordResetToast)
    } catch (err) {
      const detail = err instanceof Error ? err.message : tr.resetError
      setError(detail)
      toast.error(tr.resetFailedToast)
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
                <CardDescription>
                  {flow === "token" ? tr.resetByLinkTitle : tr.resetByOtpTitle}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <div className="space-y-3 text-sm">
                <p>{tr.passwordUpdated}</p>
                <Button asChild className="w-full">
                  <Link href="/login">{tr.signIn}</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                {/* ── Email link flow ── */}
                {flow === "token" && (
                  <div className="space-y-2">
                    <Label htmlFor="token">{tr.tokenLabel}</Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder={tr.tokenPlaceholder}
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* ── OTP flow ── */}
                {flow === "otp" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">{tr.emailAddressLabel}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={tr.emailPlaceholder}
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otp">{tr.otpReceivedLabel}</Label>
                      <Input
                        id="otp"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                      />
                    </div>
                  </>
                )}

                {/* ── Fields common to both flows ── */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{tr.newPasswordLabel}</Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={tr.passwordMinPlaceholder}
                    autoComplete="new-password"
                  />
                  <PasswordStrengthBar password={newPassword} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{tr.confirmPasswordLabel}</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    placeholder={tr.confirmPasswordPlaceholder}
                    autoComplete="new-password"
                    aria-invalid={passwordMismatch}
                  />
                  {passwordMismatch && (
                    <p className="text-xs text-red-400">{tr.passwordsDoNotMatch}</p>
                  )}
                </div>

                {/* Link to switch between flows */}
                <p className="text-center text-xs text-muted-foreground">
                  {flow === "token" ? (
                    <>{tr.noLink}{" "}
                      <Link href="/auth/forgot-password" className="text-primary hover:underline">
                        {tr.requestOtpCode}
                      </Link>
                    </>
                  ) : (
                    <>{tr.haveEmailLink}{" "}
                      <Link href="/auth/reset-password" className="text-primary hover:underline">
                        {tr.useTheLink}
                      </Link>
                    </>
                  )}
                </p>

                {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.confirmReset}
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
