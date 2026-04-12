import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin text-primary drop-shadow-[0_0_12px_rgba(78,155,255,0.28)]', className)}
      {...props}
    />
  )
}

export { Spinner }
