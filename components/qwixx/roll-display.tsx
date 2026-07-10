import type { DiceRoll } from "./dice-roller"

const DIE_STYLES = [
  "bg-card border border-border text-foreground",
  "bg-card border border-border text-foreground",
  "bg-red-500 text-white",
  "bg-yellow-400 text-white",
  "bg-green-600 text-white",
  "bg-blue-600 text-white",
]

/** Dice faces only — no computed sums or combination hints. */
export function RollChip({ roll, size = "sm" }: { roll: DiceRoll; size?: "sm" | "md" }) {
  const die = size === "md" ? "h-7 w-7 text-sm" : "h-5 w-5 text-xs"

  return (
    <div className="flex items-center gap-1 tabular-nums">
      {roll.values.map((value, i) => (
        <span
          key={i}
          className={`flex items-center justify-center rounded font-bold shadow-sm ${die} ${DIE_STYLES[i]}`}
        >
          {value}
        </span>
      ))}
    </div>
  )
}

/** Latest roll banner shown on the main score sheet. */
export function LastRollBanner({ roll }: { roll: DiceRoll }) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm sm:px-4"
      aria-live="polite"
      aria-label={`Latest roll: ${roll.values.join(", ")}`}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Last roll</span>
      <RollChip roll={roll} size="md" />
    </div>
  )
}
