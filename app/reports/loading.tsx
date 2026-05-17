import { PageSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      statCards={0}
      tableRows={12}
      tableCols={7}
    />
  )
}
