import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type ?? 'text'}
      suppressHydrationWarning
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground border-input/90 h-10 w-full min-w-0 rounded-xl border bg-input/95 px-3.5 py-2 text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_6px_16px_rgba(0,0,0,0.12)] transition-[color,box-shadow,border-color,background-color,transform] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[12px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-[13px]',
        'hover:border-border hover:bg-input focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-2 focus-visible:bg-input focus-visible:shadow-[0_0_0_1px_rgba(78,155,255,0.16),0_10px_24px_rgba(0,0,0,0.16)]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
