import { BillingPageClient } from "@/components/billing/billing-page-client"

// Force dynamic — never statically pre-render this route
export const dynamic = "force-dynamic"

export default function BillingPage() {
  return <BillingPageClient />
}
