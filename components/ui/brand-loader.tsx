"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

interface BrandLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  label?: string
}

export function BrandLoader({
  size = 200,
  label = "Loading",
  className,
  ...props
}: BrandLoaderProps) {
  const rawId = useId()
  const filterId = `lr-loader-goo-${rawId.replace(/:/g, "")}`

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        className="block"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" />
            <feComposite in="SourceGraphic" in2="blur" operator="atop" />
          </filter>
        </defs>

        <g filter={`url(#${filterId})`}>
          <path
            className="lr-loader-blob lr-loader-blob-a"
            fill="oklch(70% 0.17 50)"
            d="M100,52 C132,52 152,76 150,108 C148,140 124,152 96,150 C66,148 50,124 52,96 C54,68 72,52 100,52 Z"
          />
          <path
            className="lr-loader-blob lr-loader-blob-b"
            fill="oklch(60% 0.15 250)"
            d="M100,50 C128,48 152,72 150,104 C148,134 130,154 100,150 C70,148 48,128 52,98 C56,72 72,52 100,50 Z"
          />
        </g>

        <text className="lr-loader-wordmark" x="100" y="105" textAnchor="middle">
          LR TIME
        </text>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}
