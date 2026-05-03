"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2, Save, ShieldCheck, UserRound } from "lucide-react"
import { toast } from "sonner"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword, fetchProfile, updateProfile, type AuthUser } from "@/lib/api/auth"

export default function ProfilePage() {
  const [profile, setProfile] = useState<AuthUser | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingProfile(true)
      try {
        const user = await fetchProfile()
        if (cancelled) return
        setProfile(user)
        setUsername(user.username || "")
        setEmail(user.email || "")
        setFirstName(user.first_name || "")
        setLastName(user.last_name || "")
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Impossible de charger le profil.")
      } finally {
        if (!cancelled) {
          setLoadingProfile(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await updateProfile({
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      setProfile(updated)
      toast.success("Profil mis à jour.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de mise à jour du profil.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Le nouveau mot de passe et la confirmation ne correspondent pas.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit avoir au moins 8 caractères.")
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Mot de passe modifié.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de changer le mot de passe.")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="mx-auto w-full max-w-430 space-y-4 px-4 py-4 md:px-5">
          <Card className="border-border/60 bg-card/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Mon profil
              </CardTitle>
              <CardDescription>Informations personnelles du compte connecté.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </p>
              ) : (
                <form className="space-y-4" onSubmit={handleProfileSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-username">Nom d'utilisateur</Label>
                      <Input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input id="profile-email" value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-firstname">Prénom</Label>
                      <Input id="profile-firstname" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-lastname">Nom</Label>
                      <Input id="profile-lastname" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Enregistrer le profil
                  </Button>
                  {profile ? (
                    <p className="text-xs text-muted-foreground">
                      Compte #{profile.id} • {profile.is_active ? "Actif" : "Inactif"}
                    </p>
                  ) : null}
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Changer le mot de passe
              </CardTitle>
              <CardDescription>Le nouveau mot de passe doit être fort et unique.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="old-password">Mot de passe actuel</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Mettre à jour le mot de passe
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
