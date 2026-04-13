import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type ?? 'text'}
      suppressHydrationWarning
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground border-border/90 h-10 w-full min-w-0 rounded-xl border bg-input px-3.5 py-2 text-[12px] text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] transition-[color,box-shadow,border-color,background-color,transform] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[12px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-[13px]',
        'hover:border-border hover:bg-input focus-visible:border-ring/80 focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:bg-input focus-visible:shadow-[0_0_0_3px_rgba(24,72,200,0.10),inset_0_1px_2px_rgba(0,0,0,0.04)] dark:focus-visible:shadow-[0_0_0_3px_rgba(90,168,255,0.15),inset_0_1px_2px_rgba(0,0,0,0.08)]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
