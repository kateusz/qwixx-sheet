"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Trophy, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { totalScore, type PlayerState } from "@/lib/qwixx"

const CONFETTI_COLORS = ["bg-red-500", "bg-yellow-400", "bg-green-500", "bg-blue-500"]

function Confetti() {
  const pieces = Array.from({ length: 40 })
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
            animate={{ y: 460, opacity: [0, 1, 1, 0], rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
            transition={{ duration, delay, repeat: Number.POSITIVE_INFINITY, ease: "easeIn" }}
          />
        )
      })}
    </div>
  )
}

interface EndGameModalProps {
  open: boolean
  players: PlayerState[]
  winners: PlayerState[]
  onNewGame: () => void
  onDismiss: () => void
}

export function EndGameModal({ open, players, winners, onNewGame, onDismiss }: EndGameModalProps) {
  const ranked = [...players].sort((a, b) => totalScore(b) - totalScore(a))
  const tie = winners.length > 1
  const winnerNames = winners.map((w) => w.name).join(" & ")

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
                {tie ? "It's a tie between " : "Winner: "}
                <span className="font-bold text-foreground">{winnerNames}</span>
              </p>

              <div className="mt-5 space-y-2 text-left">
                {ranked.map((p, i) => {
                  const isWinner = winners.some((w) => w.id === p.id)
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2",
                        isWinner ? "bg-yellow-400/15 ring-1 ring-yellow-400/50" : "bg-muted/60",
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-lg font-bold tabular-nums text-foreground">{totalScore(p)}</span>
                    </div>
                  )
                })}
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
