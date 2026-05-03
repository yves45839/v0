"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, MailPlus } from "lucide-react"
import { acceptInvitation, hasAuthSession } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type InviteStatus = "idle" | "loading" | "success" | "error"

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => String(searchParams.get("token") ?? "").trim(), [searchParams])
  const authenticated = hasAuthSession()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<InviteStatus>("idle")
  const [message, setMessage] = useState("")

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!token) {
      setStatus("error")
      setMessage("Token d'invitation manquant.")
      return
    }
    if (!authenticated && (!username.trim() || password.length < 8)) {
      setStatus("error")
      setMessage("Renseigne un nom d'utilisateur et un mot de passe (8 caractères min).")
      return
    }
    setStatus("loading")
    try {
      await acceptInvitation(
        token,
        authenticated ? undefined : { username: username.trim(), password }
      )
      setStatus("success")
      setMessage("Invitation acceptée avec succès.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Impossible d'accepter l'invitation.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "success" ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <MailPlus className="h-5 w-5 text-primary" />}
            Invitation organisation
          </CardTitle>
          <CardDescription>Rejoindre votre tenant avec le lien reçu par email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authenticated ? (
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="mon-utilisateur"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8 caractères minimum"
                />
              </div>
              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Accepter l'invitation
              </Button>
            </form>
          ) : (
            <Button onClick={() => void submit()} disabled={status === "loading"} className="w-full">
              {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Accepter avec mon compte connecté
            </Button>
          )}

          {message ? (
            <p className={`text-sm ${status === "error" ? "text-red-400" : "text-muted-foreground"}`}>
              {message}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/">Tableau de bord</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
