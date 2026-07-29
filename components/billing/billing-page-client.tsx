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
import { useI18n } from "@/lib/i18n/context"
import { billingDict } from "@/lib/i18n/pages/billing"
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

const TAB_ICONS: Record<BillingTab, React.ElementType> = {
  overview: LayoutDashboard,
  plans: Sparkles,
  "payment-methods": CreditCard,
  invoices: FileText,
  usage: BarChart3,
  support: Headphones,
  custom: Building2,
}

export function BillingPageClient() {
  const { locale } = useI18n()
  const tr = billingDict[locale]
  const [activeTab, setActiveTab] = useState<BillingTab>("overview")

  const tabs: { id: BillingTab; label: string; shortLabel: string }[] = [
    { id: "overview", ...toLabels(tr.page.tabs.overview) },
    { id: "plans", ...toLabels(tr.page.tabs.plans) },
    { id: "payment-methods", ...toLabels(tr.page.tabs.paymentMethods) },
    { id: "invoices", ...toLabels(tr.page.tabs.invoices) },
    { id: "usage", ...toLabels(tr.page.tabs.usage) },
    { id: "support", ...toLabels(tr.page.tabs.support) },
    { id: "custom", ...toLabels(tr.page.tabs.custom) },
  ]

  function renderContent() {
    switch (activeTab) {
      case "overview":
        return <BillingOverview onTabChange={setActiveTab} />
      case "plans":
        return <BillingPlans onTabChange={setActiveTab} />
      case "payment-methods":
        return <BillingPaymentMethods />
      case "invoices":
        return <BillingInvoices />
      case "usage":
        return <BillingUsage onTabChange={setActiveTab} />
      case "support":
        return <BillingSupport onTabChange={setActiveTab} />
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
                  <h1 className="text-xl font-bold tracking-tight">{tr.page.title}</h1>
                  <p className="text-xs text-muted-foreground">
                    {tr.page.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Onglets ── */}
            <div className="overflow-x-auto px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-max gap-0.5 border-t border-border/40 pt-0">
                {tabs.map((tab) => {
                  const TabIcon = TAB_ICONS[tab.id]
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

function toLabels(entry: { label: string; short: string }) {
  return { label: entry.label, shortLabel: entry.short }
}
