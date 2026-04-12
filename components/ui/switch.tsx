'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:border-primary/35 data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_0_1px_rgba(78,155,255,0.18),0_10px_22px_rgba(78,155,255,0.26)] data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/35 dark:data-[state=unchecked]:bg-input/80 inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.28)] transition-all outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={
          'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-5 rounded-full ring-0 shadow-[0_3px_10px_rgba(0,0,0,0.34)] transition-transform data-[state=checked]:translate-x-[calc(100%-3px)] data-[state=unchecked]:translate-x-px'
        }
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
