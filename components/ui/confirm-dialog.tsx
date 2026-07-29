"use client"

import { useCallback, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/lib/i18n/context"
import { shellDict } from "@/lib/i18n/pages/shell"

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

/** Dialogue de confirmation partagé pour toutes les actions destructives. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const { locale } = useI18n()
  const tr = shellDict[locale]
  const resolvedConfirmLabel = confirmLabel ?? tr.confirm
  const resolvedCancelLabel = cancelLabel ?? tr.cancel
  const [pending, setPending] = useState(false)

  const handleConfirm = useCallback(async () => {
    try {
      setPending(true)
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }, [onConfirm, onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{resolvedCancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirm()
            }}
          >
            {pending ? tr.inProgress : resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export type ConfirmRequest = Omit<ConfirmDialogProps, "open" | "onOpenChange">

/**
 * Hook utilitaire : `const { confirm, dialog } = useConfirmDialog()` puis
 * `confirm({title, description, onConfirm})` pour ouvrir; rendre `{dialog}`.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [open, setOpen] = useState(false)

  const confirm = useCallback((next: ConfirmRequest) => {
    setRequest(next)
    setOpen(true)
  }, [])

  const dialog = request ? (
    <ConfirmDialog
      {...request}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setRequest(null)
      }}
    />
  ) : null

  return { confirm, dialog }
}
