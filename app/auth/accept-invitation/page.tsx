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
import { useI18n } from "@/lib/i18n/context"
import { authDict } from "@/lib/i18n/pages/auth"

type InviteStatus = "idle" | "loading" | "success" | "error"

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const { locale } = useI18n()
  const tr = authDict[locale]
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
      setMessage(tr.inviteTokenMissing)
      return
    }
    if (!authenticated && (!username.trim() || password.length < 8)) {
      setStatus("error")
      setMessage(tr.inviteCredentialsRequired)
      return
    }
    setStatus("loading")
    try {
      await acceptInvitation(
        token,
        authenticated ? undefined : { username: username.trim(), password }
      )
      setStatus("success")
      setMessage(tr.inviteAccepted)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : tr.inviteError)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "success" ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <MailPlus className="h-5 w-5 text-primary" />}
            {tr.inviteTitle}
          </CardTitle>
          <CardDescription>{tr.inviteSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authenticated ? (
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="username">{tr.usernameLabel}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={tr.usernamePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{tr.passwordLabel}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={tr.invitePasswordPlaceholder}
                />
              </div>
              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tr.acceptInvitation}
              </Button>
            </form>
          ) : (
            <Button onClick={() => void submit()} disabled={status === "loading"} className="w-full">
              {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tr.acceptWithAccount}
            </Button>
          )}

          {message ? (
            <p className={`text-sm ${status === "error" ? "text-red-400" : "text-muted-foreground"}`}>
              {message}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">{tr.signIn}</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/">{tr.dashboard}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
