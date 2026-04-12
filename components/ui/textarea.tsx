import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input/90 placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-ring/35 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-2xl border bg-input/92 px-3.5 py-3 text-[12px] leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.12)] transition-[color,box-shadow,border-color,background-color] outline-none focus-visible:ring-2 focus-visible:shadow-[0_0_0_1px_rgba(78,155,255,0.16),0_12px_26px_rgba(0,0,0,0.16)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-[13px]',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
