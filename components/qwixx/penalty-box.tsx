"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAX_PENALTIES, PENALTY_VALUE } from "@/lib/qwixx"

interface PenaltyBoxProps {
  penalties: number
  disabled: boolean
  onToggle: (index: number) => void
}

export function PenaltyBox({ penalties, disabled, onToggle }: PenaltyBoxProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Penalties</h2>
        <span className="text-xs text-muted-foreground">
          each <span className="font-bold text-destructive">-{PENALTY_VALUE}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {Array.from({ length: MAX_PENALTIES }).map((_, i) => {
          const active = i < penalties
          // Clicking the last active penalty removes it; otherwise mark up to index.
          const nextActive = active && i === penalties - 1
          return (
            <motion.button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(nextActive ? i : i + 1)}
              aria-label={`Penalty ${i + 1}`}
              aria-pressed={active}
              whileHover={disabled ? undefined : { scale: 1.08 }}
              whileTap={disabled ? undefined : { scale: 0.92 }}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-xl border-2 shadow-sm transition-colors",
                active ? "border-destructive bg-destructive/15" : "border-dashed border-border bg-muted/40",
                disabled && "cursor-not-allowed",
              )}
            >
              {active && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  transition={{ duration: 0.3, times: [0, 0.6, 1] }}
                  className="text-destructive"
                >
                  <X className="h-7 w-7" strokeWidth={3.5} />
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
