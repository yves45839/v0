import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[12px] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform,box-shadow,opacity,filter] duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2 hover:-translate-y-[1px] active:translate-y-[1px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'border border-primary/80 bg-linear-to-br from-primary via-primary to-primary/88 text-primary-foreground shadow-[0_8px_22px_rgba(24,72,200,0.28)] hover:brightness-110 hover:shadow-[0_12px_30px_rgba(24,72,200,0.36)] dark:shadow-[0_8px_22px_rgba(90,168,255,0.26)] dark:hover:shadow-[0_12px_30px_rgba(90,168,255,0.36)]',
        destructive:
          'border border-destructive/65 bg-linear-to-br from-destructive to-destructive/85 text-white shadow-[0_10px_24px_rgba(185,28,28,0.28)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:shadow-[0_10px_24px_rgba(242,82,82,0.28)]',
        outline:
          'border border-border bg-card/80 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-primary/50 hover:bg-accent hover:text-accent-foreground dark:border-border dark:bg-card/60 dark:text-foreground dark:hover:border-primary/60 dark:hover:bg-accent/80',
        secondary:
          'border border-border/80 bg-secondary text-secondary-foreground shadow-[0_6px_16px_rgba(0,0,0,0.10)] hover:bg-secondary/80 dark:hover:bg-secondary/70',
        ghost:
          'border border-transparent text-foreground/80 hover:bg-accent hover:text-accent-foreground dark:text-foreground/70 dark:hover:bg-accent/60 dark:hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-11 px-5.5 text-[13px] has-[>svg]:px-4',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
