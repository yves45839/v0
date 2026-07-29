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
import { useI18n } from "@/lib/i18n/context"
import { tenantUsersDict } from "@/lib/i18n/pages/tenant-users"
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

const TENANT_ROLE_VALUES = ["viewer", "operator", "org_admin", "tenant_admin"]

const ORGANIZATION_ROLE_VALUES = ["viewer", "operator", "org_admin"]

export default function TenantUsersPage() {
  const { locale } = useI18n()
  const tr = tenantUsersDict[locale]
  const roleLabel = (value: string) => tr.roleLabels[value] ?? value
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
        toast.error(error instanceof Error ? error.message : tr.loadOrganizationsError)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast.error(error instanceof Error ? error.message : tr.loadUsersRolesError)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error(error instanceof Error ? error.message : tr.refreshError)
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
      toast.error(tr.roleNameRequired)
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
      toast.success(tr.roleCreated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr.roleCreateError)
    } finally {
      setSavingRole(false)
    }
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedOrganizationId) return
    if (!userEmail.trim() || userPassword.length < 8) {
      toast.error(tr.userFieldsRequired)
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
      toast.success(tr.userCreated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr.userCreateError)
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
      toast.success(assigned ? tr.roleAssigned : tr.roleRemoved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr.assignError)
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
                {tr.title}
              </CardTitle>
              <CardDescription>{tr.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label>{tr.organizationLabel}</Label>
                  <Select
                    value={selectedOrganizationId ? String(selectedOrganizationId) : ""}
                    onValueChange={(value) => setSelectedOrganizationId(Number(value))}
                    disabled={initialLoading || organizations.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={initialLoading ? tr.loadingPlaceholder : tr.selectOrganizationPlaceholder} />
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
                      {tr.tenantLine(selectedOrganization.tenantName, selectedOrganization.tenantCode)}{" "}
                      <span className="font-medium">{roleLabel(selectedOrganization.tenantRole)}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => void refreshSelectedOrganization()} disabled={!selectedOrganizationId || refreshing}>
                    {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {tr.refresh}
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
                  {tr.createRoleTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleCreateRole}>
                  <div className="space-y-2">
                    <Label htmlFor="role-name">{tr.roleNameLabel}</Label>
                    <Input id="role-name" value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">{tr.roleDescriptionLabel}</Label>
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
                    <Label htmlFor="role-active">{tr.roleActiveLabel}</Label>
                  </div>
                  <Button type="submit" disabled={!selectedOrganizationId || savingRole}>
                    {savingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {tr.createRole}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-primary" />
                  {tr.createUserTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleCreateUser}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{tr.emailLabel}</Label>
                      <Input value={userEmail} onChange={(event) => setUserEmail(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr.passwordLabel}</Label>
                      <Input type="password" value={userPassword} onChange={(event) => setUserPassword(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr.usernameOptionalLabel}</Label>
                      <Input value={userUsername} onChange={(event) => setUserUsername(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr.firstNameLabel}</Label>
                      <Input value={userFirstName} onChange={(event) => setUserFirstName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr.lastNameLabel}</Label>
                      <Input value={userLastName} onChange={(event) => setUserLastName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr.tenantRoleLabel}</Label>
                      <Select value={tenantRole} onValueChange={setTenantRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TENANT_ROLE_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {roleLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>{tr.organizationRoleLabel}</Label>
                      <Select value={organizationRole} onValueChange={setOrganizationRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORGANIZATION_ROLE_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {roleLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr.customRolesToAssignLabel}</Label>
                    <div className="grid gap-2 rounded-lg border border-border/70 p-3 md:grid-cols-2">
                      {roles.length === 0 ? (
                        <p className="text-xs text-muted-foreground md:col-span-2">{tr.noCustomRolesAvailable}</p>
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
                    {tr.createUser}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 bg-card/85">
            <CardHeader>
              <CardTitle>{tr.customRolesTitle}</CardTitle>
              <CardDescription>{tr.customRolesCount(roles.length)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.length === 0 ? <p className="text-sm text-muted-foreground">{tr.noCustomRoles}</p> : null}
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
              <CardTitle>{tr.usersTitle}</CardTitle>
              <CardDescription>{tr.usersCount(users.length)}</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tr.noUsers}</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-lg border border-border/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}</p>
                        <Badge variant="outline">{roleLabel(user.tenant_role)}</Badge>
                        <Badge variant="outline">{roleLabel(user.organization_role)}</Badge>
                        {!user.is_active ? <Badge variant="secondary">{tr.inactiveBadge}</Badge> : null}
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
