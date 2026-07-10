"use client"

import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { PENALTY_VALUE, ROWS, rowScore, totalScore, type PlayerState } from "@/lib/qwixx"

const CONFETTI_COLORS = ["bg-red-500", "bg-yellow-400", "bg-green-600", "bg-blue-600"]

function Confetti() {
  const pieces = Array.from({ length: 44 })
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.6
        const duration = 1.4 + Math.random() * 1.2
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        const size = 6 + Math.random() * 8
        return (
          <motion.span
            key={i}
            className={cn("absolute top-0 rounded-sm", color)}
            style={{ left: `${left}%`, width: size, height: size }}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: 480, opacity: [0, 1, 1, 0], rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
            transition={{ duration, delay, repeat: Number.POSITIVE_INFINITY, ease: "easeIn" }}
          />
        )
      })}
    </div>
  )
}

interface EndGameModalProps {
  open: boolean
  player: PlayerState
  reason: "locks" | "penalties" | null
  onNewGame: () => void
  onDismiss: () => void
}

export function EndGameModal({ open, player, reason, onNewGame, onDismiss }: EndGameModalProps) {
  const total = totalScore(player)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="Game over"
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Confetti />
            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-white shadow-lg"
              >
                <Trophy className="h-8 w-8" strokeWidth={2.5} />
              </motion.div>
              <h2 className="mt-4 text-2xl font-black text-balance text-foreground">Game Over!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {reason === "penalties" ? "You reached 4 penalties." : "You locked 2 rows."}
              </p>

              <div className="mt-4 rounded-2xl bg-muted/60 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Final score</div>
                <div className="text-4xl font-black tabular-nums text-foreground">{total}</div>
              </div>

              <div className="mt-4 space-y-1.5 text-left">
                {ROWS.map((r) => (
                  <div key={r.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className={cn("h-2.5 w-2.5 rounded-full", r.band)} />
                      {r.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {rowScore(player.rows[r.key])}
                    </span>
                  </div>
                ))}
                {player.penalties > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-1.5">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">Penalties</span>
                    <span className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                      -{player.penalties * PENALTY_VALUE}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex-1 rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Keep viewing
                </button>
                <button
                  type="button"
                  onClick={onNewGame}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  New Game
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
