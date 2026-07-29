"use client"

import { Building2, Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveTenant } from "@/hooks/use-active-tenant"
import { setActiveTenantCode } from "@/lib/api/auth"
import { useI18n } from "@/lib/i18n/context"
import { shellDict } from "@/lib/i18n/pages/shell"

export function TenantSwitcher() {
  const { tenants, activeTenantCode, activeTenant } = useActiveTenant()
  const { locale } = useI18n()

  if (tenants.length === 0) {
    return null
  }

  const label = activeTenant?.name || activeTenantCode || tenants[0]?.name

  if (tenants.length === 1) {
    return (
      <div className="hidden h-8 items-center gap-1.5 rounded-md border border-border/70 px-2.5 text-[11px] font-semibold text-muted-foreground lg:flex">
        <Building2 className="h-3.5 w-3.5" />
        <span className="max-w-32 truncate">{label}</span>
      </div>
    )
  }

  const handleSelect = (code: string) => {
    if (code === activeTenantCode) return
    setActiveTenantCode(code)
    // Toutes les données affichées dépendent du tenant actif : rechargement
    // complet pour repartir d'un état propre.
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
          <Building2 className="h-3.5 w-3.5" />
          <span className="max-w-32 truncate text-[11px] font-semibold">{label}</span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {shellDict[locale].organization}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.code}
            onSelect={() => handleSelect(tenant.code)}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tenant.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {tenant.code} · {tenant.role}
              </p>
            </div>
            {tenant.code === activeTenantCode ? <Check className="h-4 w-4 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
