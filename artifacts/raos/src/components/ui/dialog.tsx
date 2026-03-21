import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={() => onOpenChange?.(false)} 
      />
      <div className="relative z-50 w-full max-w-lg p-6 bg-background rounded-2xl shadow-2xl animate-slide-up border border-border/50 mx-4 max-h-[90vh] overflow-y-auto">
        {children}
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
