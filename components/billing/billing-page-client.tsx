"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { BillingOverview } from "@/components/billing/billing-overview"
import { BillingPlans } from "@/components/billing/billing-plans"
import { BillingPaymentMethods } from "@/components/billing/billing-payment-methods"
import { BillingInvoices } from "@/components/billing/billing-invoices"
import { BillingUsage } from "@/components/billing/billing-usage"
import { BillingSupport } from "@/components/billing/billing-support"
import { BillingCustomOffer } from "@/components/billing/billing-custom-offer"
import type { BillingTab } from "@/components/billing/billing-tabs"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Headphones,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"

const TABS = [
  { id: "overview" as BillingTab, label: "Vue d'ensemble", shortLabel: "Vue", icon: LayoutDashboard },
  { id: "plans" as BillingTab, label: "Plans & Abonnements", shortLabel: "Plans", icon: Sparkles },
  { id: "payment-methods" as BillingTab, label: "Moyens de paiement", shortLabel: "Paiement", icon: CreditCard },
  { id: "invoices" as BillingTab, label: "Factures & Historique", shortLabel: "Factures", icon: FileText },
  { id: "usage" as BillingTab, label: "Utilisation & Limites", shortLabel: "Utilisation", icon: BarChart3 },
  { id: "support" as BillingTab, label: "Tickets & Support", shortLabel: "Support", icon: Headphones },
  { id: "custom" as BillingTab, label: "Offre sur mesure", shortLabel: "Sur mesure", icon: Building2 },
]

export function BillingPageClient() {
  const [activeTab, setActiveTab] = useState<BillingTab>("overview")

  function renderContent() {
    switch (activeTab) {
      case "overview":
        return <BillingOverview onTabChange={setActiveTab} />
      case "plans":
        return <BillingPlans onTabChange={setActiveTab} />
      case "payment-methods":
        return <BillingPaymentMethods />
      case "invoices":
        return <BillingInvoices onTabChange={setActiveTab} />
      case "usage":
        return <BillingUsage onTabChange={setActiveTab} />
      case "support":
        return <BillingSupport />
      case "custom":
        return <BillingCustomOffer />
      default:
        return null
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-shell-content flex min-w-0 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-x-hidden">
          {/* ── Page header ── */}
          <div className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Abonnements & Paiements</h1>
                  <p className="text-xs text-muted-foreground">
                    Gérez votre plan, vos moyens de paiement, vos factures et votre support.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Onglets ── */}
            <div className="overflow-x-auto px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-max gap-0.5 border-t border-border/40 pt-0">
                {TABS.map((tab) => {
                  const TabIcon = tab.icon
                  const isActive = tab.id === activeTab
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[12px] font-medium transition-all sm:px-4 sm:text-[13px]",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                    >
                      <TabIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Contenu ── */}
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
