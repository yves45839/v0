import { PageSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      statCards={3}
      tableRows={6}
      tableCols={5}
    />
  )
}
