"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Lock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { canLockRow, cellStatus, rowMarkCount, type RowConfig, type RowState } from "@/lib/qwixx"

interface ScoreRowProps {
  config: RowConfig
  row: RowState
  disabled: boolean
  onMark: (index: number) => void
  onLock: () => void
}

export function ScoreRow({ config, row, disabled, onMark, onLock }: ScoreRowProps) {
  const lockable = !disabled && canLockRow(row)
  const marks = rowMarkCount(row)

  return (
    <motion.div
      layout
      animate={{
        backgroundColor: row.locked ? "var(--muted)" : "var(--card)",
      }}
      className={cn(
        "rounded-2xl border p-2 sm:p-3 transition-colors",
        row.locked ? "border-border" : "border-border/70",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Color label */}
        <div
          className={cn(
            "flex h-11 w-14 shrink-0 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wide text-white shadow-sm sm:w-16",
            config.solid,
            row.locked && "opacity-50",
          )}
        >
          {config.label}
        </div>

        {/* Number cells + lock, horizontally scrollable on small screens */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
          {config.numbers.map((num, index) => {
            const status = cellStatus(row, index)
            const isMarked = status === "marked"
            const isAvailable = status === "available" && !disabled
            const isDimmed = status === "skipped" || status === "closed"

            return (
              <motion.button
                key={index}
                type="button"
                layout
                disabled={!isAvailable}
                onClick={() => isAvailable && onMark(index)}
                aria-label={`${config.label} ${num}${isMarked ? " marked" : ""}`}
                aria-pressed={isMarked}
                animate={
                  status === "skipped"
                    ? { opacity: 0.3, rotate: [0, -4, 4, -2, 0] }
                    : { opacity: isDimmed ? 0.3 : 1, rotate: 0 }
                }
                transition={{ duration: 0.35 }}
                whileHover={isAvailable ? { scale: 1.08 } : undefined}
                whileTap={isAvailable ? { scale: 0.92 } : undefined}
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-bold tabular-nums text-white shadow-sm sm:h-12 sm:w-12 sm:text-lg",
                  config.solid,
                  isAvailable && "cursor-pointer ring-offset-2 ring-offset-card hover:ring-2 " + config.ring,
                  !isAvailable && "cursor-not-allowed",
                )}
              >
                <span className={cn(isMarked && "opacity-40")}>{num}</span>
                <AnimatePresence>
                  {isMarked && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3, times: [0, 0.6, 1] }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <X className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={3.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}

          {/* Lock cell */}
          <motion.button
            type="button"
            layout
            disabled={!lockable}
            onClick={() => lockable && onLock()}
            aria-label={`Lock ${config.label} row`}
            whileHover={lockable ? { scale: 1.08 } : undefined}
            whileTap={lockable ? { scale: 0.92 } : undefined}
            animate={
              row.locked
                ? { scale: [1, 1.25, 1] }
                : { scale: 1, opacity: lockable ? 1 : 0.35 }
            }
            transition={{ duration: 0.4 }}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm sm:h-12 sm:w-12",
              config.solid,
              lockable && "cursor-pointer ring-offset-2 ring-offset-card hover:ring-2 " + config.ring,
              !lockable && !row.locked && "cursor-not-allowed",
            )}
          >
            <Lock className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={row.locked ? 3 : 2.25} />
          </motion.button>
        </div>

        {/* Mark count badge */}
        <div className="hidden w-10 shrink-0 text-center sm:block">
          <div className={cn("text-lg font-bold tabular-nums", config.text)}>{marks}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">marks</div>
        </div>
      </div>
    </motion.div>
  )
}
