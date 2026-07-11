import { DiceFaces, type DiceRoll } from "./dice-roller"

export function RollChip({ roll, size = "sm" }: { roll: DiceRoll; size?: "sm" | "md" }) {
  return <DiceFaces values={roll.values} size={size} />
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
