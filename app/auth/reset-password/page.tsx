"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Shield } from "lucide-react"
import { toast } from "sonner"
import { confirmPasswordReset } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { PasswordStrengthBar } from "@/components/ui/password-strength-bar"

/**
 * Wizard conditionnel :
 *  - Si ?token= présent dans l'URL  →  flux "lien email" : token + nouveau mdp
 *  - Sinon                           →  flux "OTP"       : email + code + nouveau mdp
 * Les deux flux ne sont jamais affichés simultanément.
 */
export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const tokenFromQuery = useMemo(() => String(searchParams.get("token") ?? "").trim(), [searchParams])

  // Détecter le flux au montage — si un token est dans l'URL, on utilise le flux lien
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

  const passwordMismatch = confirmTouched && confirmPassword.length > 0 && newPassword !== confirmPassword

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    if (flow === "token" && !token.trim()) {
      setError("Le token est requis. Vérifiez que vous avez bien utilisé le lien reçu par email.")
      return
    }
    if (flow === "otp") {
      if (!email.trim()) { setError("L'adresse email est requise."); return }
      if (otp.trim().length < 4) { setError("Le code OTP est incomplet."); return }
    }

    setSubmitting(true)
    try {
      await confirmPasswordReset(
        flow === "token"
          ? { token: token.trim(), new_password: newPassword }
          : { email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPassword }
      )
      setSuccess(true)
      toast.success("Mot de passe réinitialisé")
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Échec de réinitialisation."
      setError(detail)
      toast.error("Échec de réinitialisation")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
        <Card className="w-full border-border/60 bg-card/85 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">LR Time</CardTitle>
                <CardDescription>
                  {flow === "token" ? "Réinitialisation par lien email" : "Réinitialisation par code OTP"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <div className="space-y-3 text-sm">
                <p>Votre mot de passe a été mis à jour avec succès.</p>
                <Button asChild className="w-full">
                  <Link href="/login">Se connecter</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                {/* ── Flux lien email ── */}
                {flow === "token" && (
                  <div className="space-y-2">
                    <Label htmlFor="token">Token (extrait du lien reçu par email)</Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder="UUID reçu dans le lien email"
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* ── Flux OTP ── */}
                {flow === "otp" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Adresse email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="prenom.nom@societe.com"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otp">Code OTP reçu par email</Label>
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

                {/* ── Champs communs aux deux flux ── */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Au moins 8 caractères"
                    autoComplete="new-password"
                  />
                  <PasswordStrengthBar password={newPassword} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    placeholder="Retapez votre mot de passe"
                    autoComplete="new-password"
                    aria-invalid={passwordMismatch}
                  />
                  {passwordMismatch && (
                    <p className="text-xs text-red-400">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>

                {/* Lien pour passer d'un flux à l'autre */}
                <p className="text-center text-xs text-muted-foreground">
                  {flow === "token" ? (
                    <>Pas de lien ?{" "}
                      <Link href="/auth/forgot-password" className="text-primary hover:underline">
                        Demander un code OTP
                      </Link>
                    </>
                  ) : (
                    <>Vous avez un lien email ?{" "}
                      <Link href="/auth/reset-password" className="text-primary hover:underline">
                        Utiliser le lien
                      </Link>
                    </>
                  )}
                </p>

                {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
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
    </div>
  )
}
