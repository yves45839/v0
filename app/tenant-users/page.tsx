"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, ShieldCheck, UserPlus, Users2 } from "lucide-react"
import { toast } from "sonner"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  assignOrganizationRole,
  createOrganizationRole,
  createOrganizationUser,
  fetchMyOrganizations,
  fetchOrganizationRoles,
  fetchOrganizationUsers,
  setActiveTenantCode,
  type MyOrganizationGroup,
  type OrganizationCustomRoleItem,
  type OrganizationUserItem,
} from "@/lib/api/auth"

type OrganizationOption = {
  id: number
  name: string
  code: string
  tenantCode: string
  tenantName: string
  tenantRole: string
}

const TENANT_ROLES = [
  { value: "viewer", label: "viewer" },
  { value: "operator", label: "operator" },
  { value: "org_admin", label: "org_admin" },
  { value: "tenant_admin", label: "tenant_admin" },
]

const ORGANIZATION_ROLES = [
  { value: "viewer", label: "viewer" },
  { value: "operator", label: "operator" },
  { value: "org_admin", label: "org_admin" },
]

export default function TenantUsersPage() {
  const [organizationGroups, setOrganizationGroups] = useState<MyOrganizationGroup[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null)
  const [users, setUsers] = useState<OrganizationUserItem[]>([])
  const [roles, setRoles] = useState<OrganizationCustomRoleItem[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [savingRole, setSavingRole] = useState(false)
  const [assigningKey, setAssigningKey] = useState("")

  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [userUsername, setUserUsername] = useState("")
  const [userFirstName, setUserFirstName] = useState("")
  const [userLastName, setUserLastName] = useState("")
  const [tenantRole, setTenantRole] = useState("viewer")
  const [organizationRole, setOrganizationRole] = useState("viewer")
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])

  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDescription, setNewRoleDescription] = useState("")
  const [newRoleActive, setNewRoleActive] = useState(true)

  const organizations = useMemo<OrganizationOption[]>(() => {
    return organizationGroups.flatMap((group) =>
      group.organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        code: organization.code,
        tenantCode: group.tenant_code,
        tenantName: group.tenant_name,
        tenantRole: group.tenant_role,
      }))
    )
  }, [organizationGroups])

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  )

  const loadOrganizationCatalog = async () => {
    const payload = await fetchMyOrganizations()
    setOrganizationGroups(payload.results)
    const fallbackOrganization = payload.results[0]?.organizations?.[0]
    if (!fallbackOrganization) {
      setSelectedOrganizationId(null)
      return
    }
    setSelectedOrganizationId((current) => current ?? fallbackOrganization.id)
  }

  const loadCurrentOrganizationData = async (organizationId: number) => {
    const [usersPayload, rolesPayload] = await Promise.all([
      fetchOrganizationUsers(organizationId),
      fetchOrganizationRoles(organizationId),
    ])
    setUsers(usersPayload.results)
    setRoles(rolesPayload.results)
  }

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setInitialLoading(true)
      try {
        await loadOrganizationCatalog()
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Impossible de charger les organisations.")
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
        }
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedOrganizationId) return
    let cancelled = false
    const run = async () => {
      setRefreshing(true)
      try {
        await loadCurrentOrganizationData(selectedOrganizationId)
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Erreur de chargement utilisateurs/rôles.")
      } finally {
        if (!cancelled) {
          setRefreshing(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selectedOrganizationId])

  useEffect(() => {
    if (!selectedOrganization) return
    setActiveTenantCode(selectedOrganization.tenantCode)
  }, [selectedOrganization])

  const refreshSelectedOrganization = async () => {
    if (!selectedOrganizationId) return
    setRefreshing(true)
    try {
      await loadCurrentOrganizationData(selectedOrganizationId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec d'actualisation.")
    } finally {
      setRefreshing(false)
    }
  }

  const toggleRoleSelection = (roleId: number, checked: boolean) => {
    setSelectedRoleIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, roleId]))
      }
      return current.filter((id) => id !== roleId)
    })
  }

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedOrganizationId) return
    if (!newRoleName.trim()) {
      toast.error("Le nom du rôle est obligatoire.")
      return
    }
    setSavingRole(true)
    try {
      await createOrganizationRole(selectedOrganizationId, {
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        is_active: newRoleActive,
      })
      setNewRoleName("")
      setNewRoleDescription("")
      setNewRoleActive(true)
      await refreshSelectedOrganization()
      toast.success("Rôle créé.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer le rôle.")
    } finally {
      setSavingRole(false)
    }
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedOrganizationId) return
    if (!userEmail.trim() || userPassword.length < 8) {
      toast.error("Email valide et mot de passe (8 caractères min) sont obligatoires.")
      return
    }
    setSavingUser(true)
    try {
      await createOrganizationUser(selectedOrganizationId, {
        email: userEmail.trim(),
        password: userPassword,
        username: userUsername.trim() || undefined,
        first_name: userFirstName.trim() || undefined,
        last_name: userLastName.trim() || undefined,
        tenant_role: tenantRole,
        organization_role: organizationRole,
        custom_role_ids: selectedRoleIds,
      })
      setUserEmail("")
      setUserPassword("")
      setUserUsername("")
      setUserFirstName("")
      setUserLastName("")
      setTenantRole("viewer")
      setOrganizationRole("viewer")
      setSelectedRoleIds([])
      await refreshSelectedOrganization()
      toast.success("Utilisateur créé et email envoyé.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer l'utilisateur.")
    } finally {
      setSavingUser(false)
    }
  }

  const handleAssignRole = async (userId: number, roleId: number, assigned: boolean) => {
    if (!selectedOrganizationId) return
    const key = `${userId}-${roleId}`
    setAssigningKey(key)
    try {
      const response = await assignOrganizationRole(selectedOrganizationId, roleId, { user_id: userId, assigned })
      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                custom_roles: response.roles,
              }
            : user
        )
      )
      toast.success(assigned ? "Rôle attribué." : "Rôle retiré.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier l'attribution.")
    } finally {
      setAssigningKey("")
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
                <Users2 className="h-5 w-5 text-primary" />
                Comptes utilisateurs & rôles
              </CardTitle>
              <CardDescription>Création de comptes tenant, rôles personnalisés et attribution par organisation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label>Organisation</Label>
                  <Select
                    value={selectedOrganizationId ? String(selectedOrganizationId) : ""}
                    onValueChange={(value) => setSelectedOrganizationId(Number(value))}
                    disabled={initialLoading || organizations.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={initialLoading ? "Chargement..." : "Sélectionner une organisation"} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem key={organization.id} value={String(organization.id)}>
                          {organization.name} ({organization.tenantCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOrganization ? (
                    <p className="text-xs text-muted-foreground">
                      Tenant: {selectedOrganization.tenantName} ({selectedOrganization.tenantCode}) • Votre rôle tenant:{" "}
                      <span className="font-medium">{selectedOrganization.tenantRole}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => void refreshSelectedOrganization()} disabled={!selectedOrganizationId || refreshing}>
                    {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Actualiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/60 bg-card/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4 text-primary" />
                  Créer un rôle personnalisé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleCreateRole}>
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Nom du rôle</Label>
                    <Input id="role-name" value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={newRoleDescription}
                      onChange={(event) => setNewRoleDescription(event.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="role-active"
                      checked={newRoleActive}
                      onCheckedChange={(checked) => setNewRoleActive(Boolean(checked))}
                    />
                    <Label htmlFor="role-active">Rôle actif</Label>
                  </div>
                  <Button type="submit" disabled={!selectedOrganizationId || savingRole}>
                    {savingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Créer le rôle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Créer un utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleCreateUser}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={userEmail} onChange={(event) => setUserEmail(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mot de passe</Label>
                      <Input type="password" value={userPassword} onChange={(event) => setUserPassword(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom d'utilisateur (optionnel)</Label>
                      <Input value={userUsername} onChange={(event) => setUserUsername(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Prénom</Label>
                      <Input value={userFirstName} onChange={(event) => setUserFirstName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input value={userLastName} onChange={(event) => setUserLastName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rôle tenant</Label>
                      <Select value={tenantRole} onValueChange={setTenantRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TENANT_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Rôle organisation</Label>
                      <Select value={organizationRole} onValueChange={setOrganizationRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORGANIZATION_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rôles personnalisés à attribuer</Label>
                    <div className="grid gap-2 rounded-lg border border-border/70 p-3 md:grid-cols-2">
                      {roles.length === 0 ? (
                        <p className="text-xs text-muted-foreground md:col-span-2">Aucun rôle personnalisé disponible.</p>
                      ) : (
                        roles.map((role) => (
                          <label key={role.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedRoleIds.includes(role.id)}
                              onCheckedChange={(checked) => toggleRoleSelection(role.id, Boolean(checked))}
                            />
                            <span>{role.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <Button type="submit" disabled={!selectedOrganizationId || savingUser}>
                    {savingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Créer l'utilisateur
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 bg-card/85">
            <CardHeader>
              <CardTitle>Rôles personnalisés</CardTitle>
              <CardDescription>{roles.length} rôle(s) disponible(s) dans l'organisation sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.length === 0 ? <p className="text-sm text-muted-foreground">Aucun rôle personnalisé.</p> : null}
                {roles.map((role) => (
                  <Badge key={role.id} variant={role.is_active ? "default" : "secondary"}>
                    {role.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/85">
            <CardHeader>
              <CardTitle>Utilisateurs de l'organisation</CardTitle>
              <CardDescription>{users.length} utilisateur(s) trouvé(s).</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun utilisateur pour cette organisation.</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-lg border border-border/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}</p>
                        <Badge variant="outline">{user.tenant_role}</Badge>
                        <Badge variant="outline">{user.organization_role}</Badge>
                        {!user.is_active ? <Badge variant="secondary">inactif</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.email} • @{user.username}
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {roles.map((role) => {
                          const assigned = user.custom_roles.some((item) => item.id === role.id)
                          const key = `${user.id}-${role.id}`
                          return (
                            <label key={role.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-xs">
                              <Checkbox
                                checked={assigned}
                                disabled={assigningKey === key}
                                onCheckedChange={(checked) =>
                                  void handleAssignRole(user.id, role.id, Boolean(checked))
                                }
                              />
                              <span className="truncate">{role.name}</span>
                              {assigningKey === key ? <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" /> : null}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
