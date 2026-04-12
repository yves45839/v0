import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] w-fit whitespace-nowrap shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,border-color,background-color,transform] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-primary/35 bg-primary/18 text-primary shadow-[0_8px_18px_rgba(78,155,255,0.16)] [a&]:hover:bg-primary/24',
        secondary:
          'border-border/60 bg-secondary/82 text-secondary-foreground shadow-[0_8px_16px_rgba(0,0,0,0.12)] [a&]:hover:bg-secondary',
        destructive:
          'border-destructive/40 bg-destructive/18 text-destructive shadow-[0_8px_18px_rgba(227,90,90,0.14)] [a&]:hover:bg-destructive/24 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border-border/70 bg-background/35 text-foreground [a&]:hover:border-primary/35 [a&]:hover:bg-accent/70 [a&]:hover:text-accent-foreground',
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
