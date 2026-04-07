import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  fullScreen?: boolean
}

export function Dialog({ open, onOpenChange, children, fullScreen }: DialogProps) {
  if (!open) return null

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {onOpenChange && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-10 rounded-full p-1.5 bg-slate-100 hover:bg-slate-200 focus:outline-none transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 w-full max-w-lg mx-4">
        {onOpenChange && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 rounded-full p-1 opacity-60 hover:opacity-100 focus:outline-none transition-opacity"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
        <div className="p-6 bg-background rounded-2xl shadow-2xl animate-slide-up border border-border/50 max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export function DialogContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("mt-4", className)}>{children}</div>
}

export function DialogHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return <h2 className={cn("text-xl font-bold font-display tracking-tight", className)}>{children}</h2>
}

export function DialogDescription({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
}
