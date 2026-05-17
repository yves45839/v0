import { PageSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      statCards={2}
      tableRows={6}
      tableCols={5}
    />
  )
}
