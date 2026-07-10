"use client"

import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  countPlayerTokensInRow,
  rowTokenScore,
  type DuelPlayerId,
  type DuelRowState,
  type DuelState,
  type PlacementKind,
} from "@/lib/qwixx-duel"
import { ROWS, type ColorKey, type RowConfig } from "@/lib/qwixx"

const PLAYER_STYLES: Record<DuelPlayerId, { token: string; ring: string; label: string }> = {
  p1: { token: "bg-neutral-900 border-neutral-700", ring: "ring-neutral-900", label: "Black" },
  p2: { token: "bg-neutral-300 border-neutral-400", ring: "ring-neutral-400", label: "Grey" },
}

function TokenStack({ owner, stack }: { owner: DuelPlayerId; stack: number }) {
  const style = PLAYER_STYLES[owner]
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className={cn(
          "relative flex h-[72%] w-[72%] items-center justify-center rounded-full border-2 shadow-md",
          style.token,
        )}
      >
        {stack > 1 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-black text-white",
              owner === "p1" ? "bg-neutral-600" : "bg-neutral-500",
            )}
          >
            {stack}
          </span>
        )}
      </div>
    </div>
  )
}

interface DuelBoardProps {
  state: DuelState
  onPlace: (color: ColorKey, index: number) => void
  disabled: boolean
}

export function DuelBoard({ state, onPlace, disabled }: DuelBoardProps) {
  return (
    <div className="space-y-2 sm:space-y-2.5">
      {ROWS.map((config) => (
        <DuelScoreRow
          key={config.key}
          config={config}
          row={state.rows[config.key]}
          disabled={disabled || state.rows[config.key].locked}
          onPlace={(index) => onPlace(config.key, index)}
        />
      ))}

      <MisthrowRow owners={state.misthrowOwners} />
    </div>
  )
}

function DuelScoreRow({
  config,
  row,
  disabled,
  onPlace,
}: {
  config: RowConfig
  row: DuelRowState
  disabled: boolean
  onPlace: (index: number) => void
}) {
  const canTap = !disabled

  return (
    <div className={cn("flex items-center gap-1.5 rounded-2xl px-2 py-2 sm:gap-2 sm:px-3", config.band)}>
      <span
        aria-hidden
        className={cn("shrink-0", config.flag)}
        style={{
          width: 0,
          height: 0,
          borderTop: "16px solid transparent",
          borderBottom: "16px solid transparent",
          borderLeft: "20px solid currentColor",
        }}
      />

      <div className="flex flex-1 items-center gap-1 sm:gap-1.5">
        {config.numbers.map((num, index) => {
          const token = row.tokens[index]

          return (
            <motion.button
              key={index}
              type="button"
              disabled={!canTap}
              onClick={() => canTap && onPlace(index)}
              aria-label={`${config.label} ${num}${token ? `, ${PLAYER_STYLES[token.owner].label} token` : ""}`}
              whileHover={canTap ? { scale: 1.06 } : undefined}
              whileTap={canTap ? { scale: 0.95 } : undefined}
              className={cn(
                "relative flex aspect-square min-w-0 flex-1 items-center justify-center rounded-lg text-[13px] font-extrabold tabular-nums shadow-sm sm:rounded-xl sm:text-base",
                config.cell,
                config.ink,
                canTap ? "cursor-pointer" : "cursor-default",
                row.locked && "opacity-80",
              )}
            >
              <span className={cn(token && "opacity-25")}>{num}</span>
              {token && <TokenStack owner={token.owner} stack={token.stack} />}
            </motion.button>
          )
        })}

        <div
          className={cn(
            "relative flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full shadow-sm",
            config.cell,
            config.ink,
            row.lockOwner && "ring-2 ring-foreground/40",
          )}
        >
          {row.lockOwner ? (
            <div className={cn("h-[55%] w-[55%] rounded-full border-2", PLAYER_STYLES[row.lockOwner].token)} />
          ) : (
            <Lock className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={row.locked ? 3 : 2.25} />
          )}
        </div>

        <div className="flex aspect-square min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-black tabular-nums shadow-sm sm:rounded-xl sm:text-xs">
          <span className={cn("rounded px-1", config.cell, config.ink)}>{rowTokenScore(row, "p1")}</span>
          <span className={cn("rounded px-1 opacity-90", config.cell, config.ink)}>{rowTokenScore(row, "p2")}</span>
        </div>
      </div>
    </div>
  )
}

function MisthrowRow({ owners }: { owners: DuelPlayerId[] }) {
  const slots = Array.from({ length: 4 }, (_, i) => i)
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2.5">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Misthrows (−5 each)</div>
      <div className="flex gap-2">
        {slots.map((i) => {
          const owner = owners[i]
          return (
            <div
              key={i}
              className={cn(
                "flex h-9 flex-1 items-center justify-center rounded-lg border-2 border-dashed",
                owner ? PLAYER_STYLES[owner].token : "border-muted-foreground/30 bg-muted/30",
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

export function PlayerStatusBar({ state }: { state: DuelState }) {
  const active = state.active
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      {(["p1", "p2"] as const).map((id) => {
        const p = id === "p1" ? state.p1 : state.p2
        const score = (Object.keys(state.rows) as ColorKey[]).reduce(
          (sum, k) => sum + countPlayerTokensInRow(state.rows[k], id),
          0,
        )
        const style = PLAYER_STYLES[id]
        return (
          <div
            key={id}
            className={cn(
              "rounded-2xl border px-3 py-2.5",
              active === id ? "border-foreground bg-card shadow-sm" : "border-border bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full border", style.token)} />
              <span className="text-sm font-black">{p.name}</span>
              {active === id && state.phase !== "ended" && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Turn
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground tabular-nums">
              <span>{p.tokensLeft} tokens</span>
              <span>{score} on board</span>
              {p.penalties > 0 && <span className="text-red-500">−{p.penalties * 5}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { PLAYER_STYLES, type PlacementKind }
