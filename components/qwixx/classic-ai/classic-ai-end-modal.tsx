"use client"

import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROWS, rowScore, totalScore } from "@/lib/qwixx"
import { classicWinner, playerRef, type ClassicGameState, type ClassicPlayerId } from "@/lib/qwixx-classic-multi"

interface ClassicAiEndModalProps {
  open: boolean
  state: ClassicGameState
  onNewGame: () => void
  onDismiss: () => void
}

export function ClassicAiEndModal({ open, state, onNewGame, onDismiss }: ClassicAiEndModalProps) {
  const winner = classicWinner(state)

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
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
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
                {winner === "human" ? "You win!" : winner === "ai" ? "AI wins!" : "Tie!"}
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ScoreCard id="human" state={state} highlight={winner === "human"} />
                <ScoreCard id="ai" state={state} highlight={winner === "ai"} />
              </div>

              <div className="mt-4 flex gap-2">
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

function ScoreCard({
  id,
  state,
  highlight,
}: {
  id: ClassicPlayerId
  state: ClassicGameState
  highlight: boolean
}) {
  const player = playerRef(state, id)
  const score = totalScore(player)

  return (
    <div className={cn("rounded-2xl px-3 py-2.5 text-left", highlight ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50")}>
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{player.name}</div>
      <div className="text-2xl font-black tabular-nums">{score}</div>
      <div className="mt-1 space-y-0.5">
        {ROWS.map((r) => (
          <div key={r.key} className="flex justify-between text-[10px] text-muted-foreground">
            <span>{r.label}</span>
            <span className="font-bold tabular-nums">{rowScore(player.rows[r.key])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
