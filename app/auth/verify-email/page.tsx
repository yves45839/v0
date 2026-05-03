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

type VerificationStatus = "idle" | "loading" | "success" | "error"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
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
        setMessage("Votre email a bien été vérifié.")
      } catch (error) {
        if (cancelled) return
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Échec de vérification.")
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const onOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setMessage("")
    try {
      await verifyEmail({ email: email.trim().toLowerCase(), otp: otp.trim() })
      setStatus("success")
      setMessage("Votre email a bien été vérifié.")
      toast.success("Email vérifié")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Échec de vérification.")
      toast.error("Echec de vérification")
    }
  }

  const onResend = async () => {
    if (!email.trim()) {
      setStatus("error")
      setMessage("Saisissez votre email pour recevoir un nouveau code OTP.")
      return
    }
    setResending(true)
    try {
      await resendEmailVerification(email.trim().toLowerCase())
      toast.success("Code renvoyé")
      setStatus("idle")
      setMessage("Un nouveau code OTP a été envoyé.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Echec du renvoi.")
      toast.error("Echec du renvoi")
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
            Vérification d'email
          </CardTitle>
          <CardDescription>Activation de votre compte organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification en cours...
            </p>
          ) : null}
          {status !== "loading" && message ? <p className="text-sm">{message}</p> : null}

          {!token && status !== "success" ? (
            <form className="space-y-3" onSubmit={onOtpSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="samr45839@gmail.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Code OTP</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6 chiffres"
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === "loading"}>
                Vérifier avec OTP
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={resending} onClick={onResend}>
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Renvoyer le code OTP
              </Button>
            </form>
          ) : null}

          <Button asChild className="w-full">
            <Link href="/login">Aller à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
