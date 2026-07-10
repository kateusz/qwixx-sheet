"use client"

import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROWS, type ColorKey } from "@/lib/qwixx"
import { duelTotalScore, duelWinner, rowTokenScore, type DuelState } from "@/lib/qwixx-duel"
import { PLAYER_STYLES } from "./duel-board"

interface DuelEndModalProps {
  open: boolean
  state: DuelState
  onNewGame: () => void
  onDismiss: () => void
}

export function DuelEndModal({ open, state, onNewGame, onDismiss }: DuelEndModalProps) {
  const winner = duelWinner(state)
  const s1 = duelTotalScore(state, "p1")
  const s2 = duelTotalScore(state, "p2")

  const reasonText =
    state.endReason === "penalties"
      ? "4 misthrows reached."
      : state.endReason === "locks"
        ? "Two rows locked."
        : state.endReason === "last_token"
          ? "A player placed their last token."
          : "Game over."

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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-white shadow-lg">
                <Trophy className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 text-2xl font-black text-foreground">
                {winner === "tie" ? "It's a tie!" : `${(winner === "p1" ? state.p1 : state.p2).name} wins!`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{reasonText}</p>

              <div className="mt-4 space-y-2">
                {(["p1", "p2"] as const).map((id) => {
                  const p = id === "p1" ? state.p1 : state.p2
                  const total = id === "p1" ? s1 : s2
                  return (
                    <div
                      key={id}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left",
                        winner === id ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <span className={cn("h-3 w-3 rounded-full border", PLAYER_STYLES[id].token)} />
                          {p.name}
                        </span>
                        <span className="text-xl font-black tabular-nums">{total}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {(Object.keys(state.rows) as ColorKey[]).map((key) => (
                          <span key={key} className="text-[10px] text-muted-foreground">
                            {ROWS.find((r) => r.key === key)!.label}: {rowTokenScore(state.rows[key], id)}
                          </span>
                        ))}
                        {p.penalties > 0 && (
                          <span className="text-[10px] text-red-500">Penalties: −{p.penalties * 5}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  Keep viewing
                </button>
                <button
                  type="button"
                  onClick={onNewGame}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                  New game
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
