"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { Loader2, MailQuestion } from "lucide-react"
import { toast } from "sonner"
import { requestPasswordReset } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!identifier.trim()) {
      setError("Email ou nom d'utilisateur obligatoire.")
      return
    }
    setSubmitting(true)
    try {
      await requestPasswordReset(identifier.trim())
      setSuccess(true)
      toast.success("Demande envoyée")
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Impossible d'envoyer la demande."
      setError(detail)
      toast.error("Echec de la demande")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailQuestion className="h-5 w-5 text-primary" />
            Mot de passe oublié
          </CardTitle>
          <CardDescription>Recevez un lien ou un code OTP de réinitialisation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="space-y-3 text-sm">
              <p>
                Si le compte existe, un email de réinitialisation a été envoyé.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href="/auth/reset-password">Réinitialiser mon mot de passe</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Retour à la connexion</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="identifier">Email ou nom d'utilisateur</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="ex: samr45839@gmail.com"
                  autoComplete="username"
                />
              </div>
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Envoyer le lien / code OTP
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
