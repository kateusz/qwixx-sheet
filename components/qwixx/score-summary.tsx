"use client"

import { cn } from "@/lib/utils"
import {
  CONVERSION_TABLE,
  PENALTY_VALUE,
  ROWS,
  rowMarkCount,
  rowScore,
  totalScore,
  type PlayerState,
} from "@/lib/qwixx"
import { CountUp } from "./count-up"

export function ScoreSummary({ player }: { player: PlayerState }) {
  const total = totalScore(player)

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Score</h2>
        <div className="text-right">
          <div className="text-4xl font-black leading-none tabular-nums text-foreground">
            <CountUp value={total} />
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">total points</div>
        </div>
      </div>

      {/* Per-row breakdown */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROWS.map((config) => {
          const row = player.rows[config.key]
          return (
            <div key={config.key} className="rounded-xl bg-muted/50 p-2 text-center">
              <div className={cn("h-1.5 w-full rounded-full", config.solid)} />
              <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">
                <CountUp value={rowScore(row)} />
              </div>
              <div className="text-[10px] text-muted-foreground">{rowMarkCount(row)} marks</div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Penalties</span>
        <span className="text-sm font-bold text-destructive tabular-nums">
          {player.penalties} × -{PENALTY_VALUE} = -{player.penalties * PENALTY_VALUE}
        </span>
      </div>

      {/* Conversion table */}
      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
          <span className="group-open:hidden">▸ Show conversion table</span>
          <span className="hidden group-open:inline">▾ Hide conversion table</span>
        </summary>
        <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[11px] sm:grid-cols-12">
          {CONVERSION_TABLE.map(({ marks, points }) => (
            <div key={marks} className="rounded-md bg-muted/60 py-1">
              <div className="font-semibold text-muted-foreground">{marks}✗</div>
              <div className="font-bold tabular-nums text-foreground">{points}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
