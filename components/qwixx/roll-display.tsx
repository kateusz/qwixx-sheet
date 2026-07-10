import type { DiceRoll } from "./dice-roller"

/** Compact dice result chip — reused on main screen and in the dice modal. */
export function RollChip({ roll, size = "sm" }: { roll: DiceRoll; size?: "sm" | "md" }) {
  const die = size === "md" ? "h-7 w-7 text-sm" : "h-5 w-5"
  const color = size === "md" ? "px-2 py-0.5 text-sm" : "px-1.5 py-0.5"

  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <span className={`flex items-center justify-center rounded bg-card font-bold text-foreground shadow-sm ${die}`}>
        {roll.values[0]}
      </span>
      <span className={`flex items-center justify-center rounded bg-card font-bold text-foreground shadow-sm ${die}`}>
        {roll.values[1]}
      </span>
      <span className="text-xs font-bold text-muted-foreground">= {roll.whiteSum}</span>
      <span className={`rounded bg-red-500 font-bold text-white ${color}`}>{roll.values[2]}</span>
      <span className={`rounded bg-yellow-400 font-bold text-white ${color}`}>{roll.values[3]}</span>
      <span className={`rounded bg-green-600 font-bold text-white ${color}`}>{roll.values[4]}</span>
      <span className={`rounded bg-blue-600 font-bold text-white ${color}`}>{roll.values[5]}</span>
    </div>
  )
}

/** Latest roll banner shown on the main score sheet. */
export function LastRollBanner({ roll }: { roll: DiceRoll }) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm sm:px-4"
      aria-live="polite"
      aria-label={`Latest roll: white dice ${roll.values[0]} and ${roll.values[1]}, total ${roll.whiteSum}`}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Last roll</span>
      <RollChip roll={roll} size="md" />
    </div>
  )
}
