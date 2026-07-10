"use client"

import { motion } from "framer-motion"
import { Dices, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAction2Options,
  getValidPlacements,
  rowNumbers,
  type DuelPlacement,
  type DuelRoll,
  type DuelState,
} from "@/lib/qwixx-duel"
import type { ColorKey } from "@/lib/qwixx"
import { RollChip } from "../roll-display"

const COLOR_DIE_IDX: Record<ColorKey, number> = { red: 2, yellow: 3, green: 4, blue: 5 }

interface DuelTurnPanelProps {
  state: DuelState
  onRoll: (roll: DuelRoll) => void
  onRollStart: () => void
  onSkipAction1: () => void
  onEndTurn: () => void
}

export function DuelTurnPanel({ state, onRoll, onRollStart, onSkipAction1, onEndTurn }: DuelTurnPanelProps) {
  const { phase, roll, active } = state
  const player = active === "p1" ? state.p1 : state.p2

  if (phase === "ended") return null

  if (phase === "roll") {
    return (
      <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-center">
        <p className="mb-3 text-sm font-bold text-foreground">{player.name}, roll the dice</p>
        <RollButton onRoll={onRoll} onRollStart={onRollStart} />
      </div>
    )
  }

  if (!roll) return null

  const action1Placements = getValidPlacements(state, active, roll.whiteSum, undefined, state.action1)
  const action2Options = getAction2Options(state, active)
  const placedAction1 = !!state.action1

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dice</p>
        <RollChip roll={roll} size="md" />
      </div>

      {phase === "action1" && (
        <ActionBlock
          title={`Action 1 — White sum: ${roll.whiteSum}`}
          hint="Tap a highlighted cell, or skip to Action 2."
          disabledColors={state.disabledDice}
          roll={roll}
        >
          {action1Placements.length === 0 ? (
            <p className="text-xs text-muted-foreground">No valid placements for white sum.</p>
          ) : (
            <p className="text-xs text-muted-foreground">{action1Placements.length} placement(s) on the board.</p>
          )}
          <button
            type="button"
            onClick={onSkipAction1}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip to Action 2
          </button>
        </ActionBlock>
      )}

      {phase === "action2" && (
        <ActionBlock
          title="Action 2 — White + color die"
          hint={placedAction1 ? "Must use a different square than Action 1." : "Combine one white die with one color die."}
          disabledColors={state.disabledDice}
          roll={roll}
        >
          {action2Options.length === 0 ? (
            <p className="text-xs text-muted-foreground">No valid color combinations.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {action2Options.map((opt) => (
                <span
                  key={`${opt.color}-${opt.whiteIndex}-${opt.sum}`}
                  className="rounded-lg bg-muted px-2 py-1 text-xs font-bold tabular-nums"
                >
                  W{roll.values[opt.whiteIndex]}+{opt.color[0].toUpperCase()}
                  {roll.values[COLOR_DIE_IDX[opt.color]]}={opt.sum}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onEndTurn}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            End turn{!placedAction1 && " (misthrow if nothing placed)"}
          </button>
        </ActionBlock>
      )}
    </div>
  )
}

function ActionBlock({
  title,
  hint,
  children,
  disabledColors,
  roll,
}: {
  title: string
  hint: string
  children: React.ReactNode
  disabledColors: ColorKey[]
  roll: DuelRoll
}) {
  const colors: ColorKey[] = ["red", "yellow", "green", "blue"]
  return (
    <div>
      <p className="text-sm font-black text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 flex gap-1">
        {colors.map((color) => {
          const off = disabledColors.includes(color)
          const idx = COLOR_DIE_IDX[color]
          return (
            <span
              key={color}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold text-white",
                off
                  ? "bg-muted text-muted-foreground line-through"
                  : color === "red"
                    ? "bg-red-500"
                    : color === "yellow"
                      ? "bg-yellow-500 text-yellow-950"
                      : color === "green"
                        ? "bg-green-600"
                        : "bg-blue-600",
              )}
            >
              {color[0].toUpperCase()}
              {roll.values[idx]}
            </span>
          )
        })}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function RollButton({ onRoll, onRollStart }: { onRoll: (roll: DuelRoll) => void; onRollStart: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => {
        onRollStart()
        const values = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1)
        onRoll({ values, whiteSum: values[0] + values[1], ts: Date.now() })
      }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm"
    >
      <Dices className="h-5 w-5" />
      Roll
    </motion.button>
  )
}

export function duelHighlights(state: DuelState): DuelPlacement[] {
  if (!state.roll || state.phase === "roll" || state.phase === "ended") return []
  if (state.phase === "action1") {
    return getValidPlacements(state, state.active, state.roll.whiteSum, undefined, state.action1)
  }
  return getAction2Options(state, state.active).flatMap((o) => o.placements)
}

export function numberAt(_state: DuelState, color: ColorKey, index: number): number {
  return rowNumbers(color)[index]
}
