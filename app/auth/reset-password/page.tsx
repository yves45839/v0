"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { confirmPasswordReset } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const tokenFromQuery = useMemo(() => String(searchParams.get("token") ?? "").trim(), [searchParams])
  const [token, setToken] = useState(tokenFromQuery)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit avoir au moins 8 caractères.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }
    const hasToken = token.trim().length > 0
    const hasOtpFlow = email.trim().length > 0 && otp.trim().length > 0
    if (!hasToken && !hasOtpFlow) {
      setError("Saisis soit le token, soit email + code OTP.")
      return
    }

    setSubmitting(true)
    try {
      await confirmPasswordReset({
        ...(hasToken ? { token: token.trim() } : {}),
        ...(!hasToken ? { email: email.trim().toLowerCase(), otp: otp.trim() } : {}),
        new_password: newPassword,
      })
      setSuccess(true)
      toast.success("Mot de passe réinitialisé")
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Echec de réinitialisation."
      setError(detail)
      toast.error("Echec de réinitialisation")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Réinitialiser le mot de passe
          </CardTitle>
          <CardDescription>Utilisez le lien reçu par email ou le code OTP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="space-y-3 text-sm">
              <p>Votre mot de passe a été mis à jour.</p>
              <Button asChild className="w-full">
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="token">Token (optionnel si OTP)</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="UUID reçu dans le lien email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (si OTP)</Label>
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
                <Label htmlFor="otp">Code OTP (si OTP)</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6 chiffres"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Valider la réinitialisation
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
