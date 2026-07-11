"use client"

import { motion } from "framer-motion"
import { Dices, SkipForward } from "lucide-react"
import type { ClassicGameState } from "@/lib/qwixx-classic-multi"
import { DiceFaces, type DiceRoll } from "../dice-roller"

interface ClassicAiTurnPanelProps {
  state: ClassicGameState
  aiThinking: boolean
  onRoll: (values: number[]) => void
  onRollStart: () => void
  onSkipWhite: () => void
  onEndTurn: () => void
}

export function ClassicAiTurnPanel({
  state,
  aiThinking,
  onRoll,
  onRollStart,
  onSkipWhite,
  onEndTurn,
}: ClassicAiTurnPanelProps) {
  const { phase, roll, active } = state

  if (phase === "ended") return null

  if (phase === "roll") {
    if (active === "ai") {
      return (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-sm font-bold text-muted-foreground">{aiThinking ? "AI rolling…" : "AI's turn"}</p>
        </div>
      )
    }
    return (
      <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-center">
        <p className="mb-3 text-sm font-bold text-foreground">Your turn — roll the dice</p>
        <RollButton onRoll={onRoll} onRollStart={onRollStart} />
      </div>
    )
  }

  if (!roll) return null

  const rollDisplay: DiceRoll = { values: roll.values, whiteSum: roll.whiteSum, ts: roll.ts }

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dice</p>
        <DiceFaces values={rollDisplay.values} compact />
      </div>

      {phase === "whiteHuman" && (
        <PhaseBlock title="White sum — your card" hint="Optional. Tap a valid cell on your sheet, or skip.">
          <button
            type="button"
            onClick={onSkipWhite}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </button>
        </PhaseBlock>
      )}

      {phase === "whiteAi" && (
        <p className="text-xs text-muted-foreground">{aiThinking ? "AI deciding…" : "AI white sum…"}</p>
      )}

      {phase === "colorHuman" && active === "human" && (
        <PhaseBlock
          title="White + color — your turn"
          hint={
            state.colorMoveUsed
              ? "Color move done. End your turn."
              : state.turnPlaced
                ? "Optional color combo, or end turn."
                : "Mark a cell or end turn (−5 if nothing placed)."
          }
        >
          <button
            type="button"
            onClick={onEndTurn}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            End turn{!state.turnPlaced && " (−5 penalty)"}
          </button>
        </PhaseBlock>
      )}

      {phase === "colorAi" && (
        <p className="text-xs text-muted-foreground">{aiThinking ? "AI choosing color combo…" : "AI color move…"}</p>
      )}

      {phase === "whiteHuman" && active === "ai" && (
        <p className="text-xs text-muted-foreground">AI rolled — you may use the white sum on your sheet.</p>
      )}
    </div>
  )
}

function PhaseBlock({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-black text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function RollButton({ onRoll, onRollStart }: { onRoll: (values: number[]) => void; onRollStart: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => {
        onRollStart()
        const values = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1)
        onRoll(values)
      }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm"
    >
      <Dices className="h-5 w-5" />
      Roll
    </motion.button>
  )
}
