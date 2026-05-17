import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ─── Sub-parts ─────────────────────────────────────────────────────────────

/** Single stat card placeholder (matches KPI card dimensions). */
function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4",
        className,
      )}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  )
}

/** A single table-row placeholder (variable width cells). */
function TableRowSkeleton({
  cols = 5,
  className,
}: {
  cols?: number
  className?: string
}) {
  const widths = ["w-28", "w-20", "w-16", "w-24", "w-12", "w-32", "w-14"]
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-white/[0.04] px-4 py-3",
        className,
      )}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 shrink-0", widths[i % widths.length])}
        />
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export interface PageSkeletonProps {
  /**
   * Number of KPI stat cards to render.
   * Pass 0 to hide the stat-card row.
   * @default 4
   */
  statCards?: number
  /**
   * Number of table rows to render.
   * Pass 0 to hide the table section.
   * @default 8
   */
  tableRows?: number
  /**
   * Number of columns per table row.
   * @default 5
   */
  tableCols?: number
  /** Show the top page-header skeleton (title + action buttons). @default true */
  showHeader?: boolean
  /** Show a toolbar skeleton above the table. @default true */
  showToolbar?: boolean
  /** Additional class on the root element. */
  className?: string
}

/**
 * Full-page loading skeleton.
 *
 * Mimics the standard page structure used throughout the app:
 * page header → stat cards row → optional toolbar → table body.
 *
 * @example
 *   // In a page component while data is loading:
 *   if (isLoading) return <PageSkeleton />
 *
 *   // Reports page layout (no stat cards, more rows):
 *   <PageSkeleton statCards={0} tableRows={12} tableCols={7} />
 *
 *   // Planning page:
 *   <PageSkeleton statCards={3} tableRows={6} showToolbar />
 */
export function PageSkeleton({
  statCards = 4,
  tableRows = 8,
  tableCols = 5,
  showHeader = true,
  showToolbar = true,
  className,
}: PageSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement en cours…"
      className={cn("flex flex-col gap-6 p-6", className)}
    >
      {/* Page header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      )}

      {/* Stat cards */}
      {statCards > 0 && (
        <div
          className={cn(
            "grid gap-4",
            statCards === 1 && "grid-cols-1",
            statCards === 2 && "grid-cols-2",
            statCards === 3 && "grid-cols-3",
            statCards >= 4 && "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {Array.from({ length: statCards }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Table panel */}
      {tableRows > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
          {/* Toolbar */}
          {showToolbar && (
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-8 w-32 rounded-lg" />
              <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          )}

          {/* Column headers */}
          <div className="flex items-center gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
            {Array.from({ length: tableCols }).map((_, i) => (
              <Skeleton key={i} className="h-2.5 w-16 opacity-60" />
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: tableRows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={tableCols} />
          ))}
        </div>
      )}
    </div>
  )
}
