"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, MailWarning } from "lucide-react"
import { toast } from "sonner"
import { resendEmailVerification, verifyEmail } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/context"
import { authDict } from "@/lib/i18n/pages/auth"

type VerificationStatus = "idle" | "loading" | "success" | "error"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const { locale } = useI18n()
  const tr = authDict[locale]
  const token = useMemo(() => String(searchParams.get("token") ?? "").trim(), [searchParams])
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [resending, setResending] = useState(false)
  const [status, setStatus] = useState<VerificationStatus>("idle")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const run = async () => {
      setStatus("loading")
      try {
        await verifyEmail({ token })
        if (cancelled) return
        setStatus("success")
        setMessage(tr.emailVerified)
      } catch (error) {
        if (cancelled) return
        setStatus("error")
        setMessage(error instanceof Error ? error.message : tr.verifyFailed)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const onOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setMessage("")
    try {
      await verifyEmail({ email: email.trim().toLowerCase(), otp: otp.trim() })
      setStatus("success")
      setMessage(tr.emailVerified)
      toast.success(tr.emailVerifiedToast)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : tr.verifyFailed)
      toast.error(tr.verifyFailedToast)
    }
  }

  const onResend = async () => {
    if (!email.trim()) {
      setStatus("error")
      setMessage(tr.enterEmailForOtp)
      return
    }
    setResending(true)
    try {
      await resendEmailVerification(email.trim().toLowerCase())
      toast.success(tr.otpResentToast)
      setStatus("idle")
      setMessage(tr.otpResent)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : tr.resendFailed)
      toast.error(tr.resendFailedToast)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "success" ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <MailWarning className="h-5 w-5 text-primary" />}
            {tr.verifyTitle}
          </CardTitle>
          <CardDescription>{tr.verifySubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr.verifying}
            </p>
          ) : null}
          {status !== "loading" && message ? <p className="text-sm">{message}</p> : null}

          {!token && status !== "success" ? (
            <form className="space-y-3" onSubmit={onOtpSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">{tr.emailLabel}</Label>
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
                <Label htmlFor="otp">{tr.otpLabel}</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder={tr.otpPlaceholder}
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === "loading"}>
                {tr.verifyWithOtp}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={resending} onClick={onResend}>
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tr.resendOtp}
              </Button>
            </form>
          ) : null}

          <Button asChild className="w-full">
            <Link href="/login">{tr.goToLogin}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
