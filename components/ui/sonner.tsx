'use client'

import type { CSSProperties } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      expand
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-[1.35rem] group-[.toaster]:border-border/70 group-[.toaster]:bg-popover/95 group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:text-popover-foreground group-[.toaster]:shadow-[0_24px_54px_rgba(0,0,0,0.32)] group-[.toaster]:backdrop-blur-md',
          title: 'text-[13px] font-semibold tracking-tight',
          description: 'text-[12px] leading-relaxed text-muted-foreground',
          actionButton:
            'rounded-xl border border-border/70 bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(78,155,255,0.26)]',
          cancelButton:
            'rounded-xl border border-border/70 bg-secondary text-secondary-foreground',
          closeButton:
            'border-border/70 bg-background/50 text-foreground/70 hover:bg-accent hover:text-foreground',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
