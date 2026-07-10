"use client"

import { motion } from "framer-motion"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { totalScore, type PlayerState } from "@/lib/qwixx"

interface PlayerTabsProps {
  players: PlayerState[]
  activeId: string
  disabled: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function PlayerTabs({ players, activeId, disabled, onSelect, onAdd, onRemove }: PlayerTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {players.map((p) => {
        const active = p.id === activeId
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="active-player-tab"
                className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{p.name}</span>
            <span
              className={cn(
                "relative z-10 rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                active ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {totalScore(p)}
            </span>
            {players.length > 2 && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${p.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(p.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    onRemove(p.id)
                  }
                }}
                className="relative z-10 -mr-1 rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        )
      })}
      {!disabled && players.length < 6 && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add player"
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Player
        </button>
      )}
    </div>
  )
}
