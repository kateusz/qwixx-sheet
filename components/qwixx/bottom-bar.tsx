"use client"

import { motion } from "framer-motion"
import { Dices, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { PENALTY_VALUE, ROWS, rowScore, totalMarks, totalScore, type PlayerState } from "@/lib/qwixx"
import { CountUp } from "./count-up"

interface BottomBarProps {
  player: PlayerState
  muted: boolean
  onOpenSettings: () => void
  onReset: () => void
  onToggleMute: () => void
  onOpenDice: () => void
  onSetPenalties: (count: number) => void
  disabled: boolean
}

function ActionButton({
  label,
  active,
  variant = "solid",
  onClick,
  children,
}: {
  label: string
  active?: boolean
  variant?: "solid" | "muted"
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors sm:h-12 sm:w-12",
        variant === "muted"
          ? "bg-secondary text-secondary-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </motion.button>
  )
}

export function BottomBar({
  player,
  muted,
  onOpenSettings,
  onReset,
  onToggleMute,
  onOpenDice,
  onSetPenalties,
  disabled,
}: BottomBarProps) {
  const total = totalScore(player)
  const marks = totalMarks(player)

  function bumpPenalty() {
    if (disabled) return
    onSetPenalties(Math.min(4, player.penalties + 1))
  }
  function dropPenalty() {
    if (disabled) return
    onSetPenalties(Math.max(0, player.penalties - 1))
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ActionButton label="Settings and rules" variant="solid" onClick={onOpenSettings}>
          <Settings className="h-5 w-5" />
        </ActionButton>
        <ActionButton label="New game" variant="muted" onClick={onReset}>
          <RotateCcw className="h-5 w-5" />
        </ActionButton>
        <ActionButton label={muted ? "Unmute sounds" : "Mute sounds"} variant="solid" onClick={onToggleMute}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </ActionButton>
        <ActionButton label="Roll the dice" variant="solid" onClick={onOpenDice}>
          <Dices className="h-5 w-5" />
        </ActionButton>
      </div>

      {/* Score summary */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Total */}
        <div className="relative">
          <span className="absolute -top-2 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-bold tabular-nums text-background shadow">
            {marks}
          </span>
          <SummaryBox label="Total" emphasis>
            <CountUp value={total} />
          </SummaryBox>
        </div>

        {/* Per-color scores */}
        {ROWS.map((config) => (
          <SummaryBox key={config.key} label={config.label} dotClass={config.band}>
            {rowScore(player.rows[config.key])}
          </SummaryBox>
        ))}

        {/* Penalties */}
        <button
          type="button"
          onClick={bumpPenalty}
          onContextMenu={(e) => {
            e.preventDefault()
            dropPenalty()
          }}
          aria-label={`Penalties: ${player.penalties}. Tap to add, right-click to remove.`}
          className="flex flex-col items-center"
        >
          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Penalty</span>
          <span
            className={cn(
              "flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-lg font-black tabular-nums shadow-sm transition-colors sm:h-12 sm:min-w-12 sm:text-xl",
              player.penalties > 0 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground",
            )}
          >
            {player.penalties > 0 ? `-${player.penalties * PENALTY_VALUE}` : 0}
          </span>
        </button>
      </div>
    </div>
  )
}

function SummaryBox({
  label,
  children,
  emphasis,
  dotClass,
}: {
  label: string
  children: React.ReactNode
  emphasis?: boolean
  dotClass?: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {dotClass && <span className={cn("h-2 w-2 rounded-full", dotClass)} />}
        {label}
      </span>
      <span
        className={cn(
          "flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-lg font-black tabular-nums shadow-sm sm:h-12 sm:min-w-12 sm:text-xl",
          emphasis ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border",
        )}
      >
        {children}
      </span>
    </div>
  )
}
