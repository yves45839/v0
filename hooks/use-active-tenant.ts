"use client"

import { useCallback, useEffect, useState } from "react"

import {
  AUTH_EVENTS,
  getActiveTenantCode,
  getAuthSession,
  type AuthTenant,
} from "@/lib/api/auth"

export type ActiveTenantState = {
  tenants: AuthTenant[]
  activeTenantCode: string
  activeTenant: AuthTenant | null
}

function readState(): ActiveTenantState {
  const session = getAuthSession()
  const tenants = session?.tenants ?? []
  const activeTenantCode = getActiveTenantCode()
  return {
    tenants,
    activeTenantCode,
    activeTenant: tenants.find((tenant) => tenant.code === activeTenantCode) ?? null,
  }
}

/**
 * Tenant actif de la session, resynchronisé sur les changements de session
 * (login, logout, changement de tenant, autre onglet).
 */
export function useActiveTenant(): ActiveTenantState {
  const [state, setState] = useState<ActiveTenantState>(() => readState())

  const sync = useCallback(() => {
    setState(readState())
  }, [])

  useEffect(() => {
    sync()
    window.addEventListener(AUTH_EVENTS.SESSION_CHANGED, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(AUTH_EVENTS.SESSION_CHANGED, sync)
      window.removeEventListener("storage", sync)
    }
  }, [sync])

  return state
}
