import { cn } from "@/lib/utils"

type LRLogoMarkProps = {
  className?: string
}

export function LRLogoMark({ className }: LRLogoMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-8 w-9 shrink-0 items-center justify-center bg-white text-[17px] font-semibold leading-none text-[#2a3d7e] shadow-[0_8px_18px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      <span>L</span>
      <span className="text-[#f97316]">R</span>
    </div>
  )
}
