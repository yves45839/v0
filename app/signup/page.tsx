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

type SubmitStatus = "idle" | "submitting" | "success"

export default function SignupPage() {
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
      setError("Le nom de la société est obligatoire.")
      return
    }
    if (!email.trim()) {
      setError("L'email est obligatoire.")
      return
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
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
      toast.success("Compte créé. Vérifiez votre email.")
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Inscription impossible."
      setError(detail)
      setStatus("idle")
      toast.error("Échec d'inscription")
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
                <CardTitle className="text-lg">LR Time</CardTitle>
                <CardDescription>Créer un compte et confirmer votre email</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {status === "success" ? (
              <div className="space-y-3 text-sm">
                <p>
                  {emailSent
                    ? "Inscription enregistrée. Un email de vérification a été envoyé."
                    : "Inscription enregistrée. Le compte est en attente de vérification email/OTP."}
                </p>
                {verificationExpiresAt ? (
                  <p className="text-muted-foreground">Expiration du lien: {new Date(verificationExpiresAt).toLocaleString()}</p>
                ) : null}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/verify-email">Vérifier avec OTP ou lien</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/login">Aller a la connexion</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Nom de la société</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tenantName"
                      value={tenantName}
                      onChange={(event) => setTenantName(event.target.value)}
                      className="pl-9"
                      placeholder="ACME Security"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organisation (optionnel)</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="organizationName"
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      className="pl-9"
                      placeholder="Siege"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-9"
                      placeholder="prenom.nom@société.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Au moins 8 caractères"
                    autoComplete="new-password"
                  />
                  <PasswordStrengthBar password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Retapez votre mot de passe"
                    autoComplete="new-password"
                  />
                </div>
                {error ? <p className="text-xs text-red-400">{error}</p> : null}
                <Button type="submit" disabled={!canSubmit} className="w-full">
                  {status === "submitting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Créer mon compte
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Déjà inscrit ?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Se connecter
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
