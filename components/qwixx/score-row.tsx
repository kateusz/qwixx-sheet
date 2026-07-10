"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { cellStatus, rowMarkCount, rowScore, type RowConfig, type RowState } from "@/lib/qwixx"

interface ScoreRowProps {
  config: RowConfig
  row: RowState
  disabled: boolean
  onMark: (index: number) => void
}

/** A single full-width colored band: flag pointer, number cells, lock, score. */
export function ScoreRow({ config, row, disabled, onMark }: ScoreRowProps) {
  const marks = rowMarkCount(row)

  return (
    <div className={cn("flex items-center gap-1.5 rounded-2xl px-2 py-2 sm:gap-2 sm:px-3", config.band)}>
      {/* Flag pointer */}
      <span
        aria-hidden
        className={cn("shrink-0", config.flag)}
        style={{
          width: 0,
          height: 0,
          borderTop: "16px solid transparent",
          borderBottom: "16px solid transparent",
          borderLeft: "20px solid currentColor",
        }}
      />

      {/* Cells */}
      <div className="flex flex-1 items-center gap-1 sm:gap-1.5">
        {config.numbers.map((num, index) => {
          const status = cellStatus(row, index, config.numbers.length)
          const isMarked = status === "marked"
          const isAvailable = status === "available" && !disabled
          const isSkipped = status === "skipped"

          return (
            <motion.button
              key={index}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onMark(index)}
              aria-label={`${config.label} ${num}${isMarked ? ", crossed out" : ""}`}
              aria-pressed={isMarked}
              animate={
                isSkipped
                  ? { opacity: 0.35, rotate: [0, -5, 5, -3, 0] }
                  : { opacity: status === "locked-out" ? 0.45 : 1, rotate: 0 }
              }
              transition={{ duration: 0.35 }}
              whileHover={isAvailable ? { scale: 1.12 } : undefined}
              whileTap={isAvailable ? { scale: 0.9 } : undefined}
              className={cn(
                "relative flex aspect-square min-w-0 flex-1 items-center justify-center rounded-lg text-[13px] font-extrabold tabular-nums shadow-sm sm:rounded-xl sm:text-base",
                config.cell,
                config.ink,
                isAvailable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span className={cn(isMarked && "opacity-30")}>{num}</span>
              <AnimatePresence>
                {isMarked && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.25, 1], opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3, times: [0, 0.6, 1] }}
                    className={cn("absolute inset-0 flex items-center justify-center", config.ink)}
                  >
                    <XMark />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}

        {/* Lock indicator (auto-locks when the right-most number is crossed) */}
        <motion.div
          aria-label={row.locked ? `${config.label} row locked` : `${config.label} lock`}
          animate={row.locked ? { scale: [1, 1.3, 1] } : { scale: 1, opacity: 0.85 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full shadow-sm",
            config.cell,
            config.ink,
          )}
        >
          <Lock className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={row.locked ? 3 : 2.25} />
        </motion.div>

        {/* Live row score */}
        <div
          className={cn(
            "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-lg text-[13px] font-black tabular-nums shadow-sm sm:rounded-xl sm:text-base",
            config.cell,
            config.ink,
          )}
        >
          {rowScore(row)}
        </div>
      </div>

      {/* Mark count badge (wider screens only) */}
      <div className="hidden w-8 shrink-0 text-center text-white sm:block">
        <div className="text-base font-black tabular-nums leading-none">{marks}</div>
        <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">X</div>
      </div>
    </div>
  )
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[85%] w-[85%]" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round">
      <path d="M5 5 L19 19 M19 5 L5 19" />
    </svg>
  )
}
