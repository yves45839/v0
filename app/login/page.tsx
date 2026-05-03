"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, LockKeyhole, Shield, UserRound } from "lucide-react"
import { toast } from "sonner"
import { loginWithCredentials, hasAuthSession } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next")
    if (!raw) return "/"
    if (!raw.startsWith("/")) return "/"
    return raw
  }, [searchParams])

  useEffect(() => {
    if (!hasAuthSession()) return
    router.replace(nextPath)
  }, [nextPath, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!identifier.trim() || !password.trim()) {
      setError("Identifiant et mot de passe sont obligatoires.")
      return
    }
    setSubmitting(true)
    try {
      await loginWithCredentials(identifier.trim(), password)
      toast.success("Connexion réussie")
      router.replace(nextPath)
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Connexion impossible."
      setError(detail)
      toast.error("Échec de connexion")
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
                <CardTitle className="text-lg">SecurePoint</CardTitle>
                <CardDescription>Connexion à votre organisation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="identifier">Email ou nom d'utilisateur</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="pl-9"
                    placeholder="noreply@label-ci.com"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9"
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                  />
                </div>
                <div className="text-right">
                  <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Se connecter
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pas de compte ?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Creer un compte
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
