import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,border-color,background-color,transform] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-primary/40 bg-primary/15 text-primary shadow-[0_4px_12px_rgba(24,72,200,0.14)] dark:border-primary/35 dark:bg-primary/18 dark:text-primary dark:shadow-[0_4px_12px_rgba(90,168,255,0.18)] [a&]:hover:bg-primary/24',
        secondary:
          'border-border/70 bg-secondary text-secondary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)] [a&]:hover:bg-secondary/80',
        destructive:
          'border-destructive/50 bg-destructive/14 text-destructive shadow-[0_4px_12px_rgba(185,28,28,0.12)] dark:border-destructive/40 dark:bg-destructive/20 dark:text-destructive [a&]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border-border/80 bg-background/60 text-foreground dark:bg-background/40 [a&]:hover:border-primary/40 [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
