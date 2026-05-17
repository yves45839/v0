import { PricingPageClient } from "@/components/billing/pricing-page-client"

// Always render fresh — plans come from the live Stripe catalog.
export const dynamic = "force-dynamic"

export default function PricingPage() {
  return <PricingPageClient />
}
