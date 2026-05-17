'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  /** Affiche un indicateur de force si true */
  showStrength?: boolean
}

function PasswordInput({ className, showStrength: _showStrength, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative w-full">
      <input
        type={visible ? 'text' : 'password'}
        suppressHydrationWarning
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground border-border/90 h-10 w-full min-w-0 rounded-xl border bg-input px-3.5 py-2 pr-10 text-[12px] text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] transition-[color,box-shadow,border-color,background-color,transform] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-[13px]',
          'hover:border-border hover:bg-input focus-visible:border-ring/80 focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:bg-input focus-visible:shadow-[0_0_0_3px_rgba(24,72,200,0.10),inset_0_1px_2px_rgba(0,0,0,0.04)] dark:focus-visible:shadow-[0_0_0_3px_rgba(90,168,255,0.15),inset_0_1px_2px_rgba(0,0,0,0.08)]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
