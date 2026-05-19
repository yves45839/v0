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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [resetResponse, setResetResponse] = useState<PasswordResetRequestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!identifier.trim()) {
      setError("Email ou nom d’utilisateur obligatoire.")
      return
    }
    if (identifier.includes("@") && !EMAIL_RE.test(identifier.trim())) {
      setError("Le format de l’adresse email est invalide.")
      return
    }

    setSubmitting(true)
    try {
      const response = await requestPasswordReset(identifier.trim())
      setResetResponse(response)
      toast.success("Demande envoyée")
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Impossible d’envoyer la demande."
      setError(detail)
      toast.error("Échec de la demande")
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
                <CardTitle className="text-lg">LR Time</CardTitle>
                <CardDescription>Mot de passe oublié</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetResponse ? (
              <div className="space-y-3 text-sm">
                <p className="text-foreground">
                  {resetResponse.email_sent
                    ? "Si ce compte existe, un email de réinitialisation vient d’être envoyé. Consultez votre boîte mail puis cliquez sur le lien reçu."
                    : "Si ce compte existe, un code OTP a été généré. Utilisez-le sur la page de réinitialisation."}
                </p>
                {resetResponse.expires_at ? (
                  <p className="text-xs text-muted-foreground">
                    Lien / code valable jusqu&apos;au :{" "}
                    <span className="font-medium text-foreground">
                      {new Date(resetResponse.expires_at).toLocaleString("fr-FR")}
                    </span>
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 pt-1">
                  <Button asChild variant="outline">
                    <Link href="/login">Retour à la connexion</Link>
                  </Button>
                  <Button asChild variant="ghost" className="text-xs">
                    <Link href="/auth/reset-password">J&apos;ai mon code / token →</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email ou nom d&apos;utilisateur</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="prenom.nom@société.com"
                    autoComplete="username"
                  />
                </div>
                {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Envoyer le lien de réinitialisation
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
