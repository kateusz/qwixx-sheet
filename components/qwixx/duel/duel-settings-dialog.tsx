"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Moon, RotateCcw, Sun, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CONVERSION_TABLE, ROWS } from "@/lib/qwixx"

interface DuelSettingsDialogProps {
  open: boolean
  p1Name: string
  p2Name: string
  theme: "light" | "dark"
  onClose: () => void
  onP1NameChange: (name: string) => void
  onP2NameChange: (name: string) => void
  onThemeToggle: () => void
  onReset: () => void
}

const RULES = [
  "Two players share one device. Each has 22 tokens (black vs grey).",
  "On your turn, roll all six dice. Only the active player may act — the opponent does nothing.",
  "Action 1: Use the sum of both white dice. Place one token in any row (optional).",
  "Action 2: Combine one white die + one color die. Place in that color's row (optional). If both actions place tokens, they must be different squares.",
  "If you use neither action, place a misthrow token (−5 points). Game ends at 4 misthrows total.",
  "Place tokens left to right in each row (your own tokens define position). Gaps are allowed.",
  "Only the foremost token in each row can be beaten by an opponent rolling that exact number. Stacks of 2+ cannot be beaten.",
  "If you own the foremost token, you may stack on it with the same number, or advance further right.",
  "Lock a row by placing on the far-right number (after 5+ tokens in that row) plus the lock — that color die is removed.",
  "Game ends when a player places their last token, 4 misthrows are reached, or 2 rows are locked.",
]

export function DuelSettingsDialog({
  open,
  p1Name,
  p2Name,
  theme,
  onClose,
  onP1NameChange,
  onP2NameChange,
  onThemeToggle,
  onReset,
}: DuelSettingsDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Settings and rules"
        >
          <motion.div
            className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
            initial={{ y: 60, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-black">Settings</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="duel-p1" className="mb-1 block text-xs font-bold">
                    Player 1 (black)
                  </label>
                  <input
                    id="duel-p1"
                    value={p1Name}
                    onChange={(e) => onP1NameChange(e.target.value)}
                    maxLength={16}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="duel-p2" className="mb-1 block text-xs font-bold">
                    Player 2 (grey)
                  </label>
                  <input
                    id="duel-p2"
                    value={p2Name}
                    onChange={(e) => onP2NameChange(e.target.value)}
                    maxLength={16}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={onThemeToggle} className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
                <button type="button" onClick={onReset} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground">
                  <RotateCcw className="h-4 w-4" />
                  New game
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Qwixx Duel rules</h3>
                <ol className="space-y-2">
                  {RULES.map((rule, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">{i + 1}</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Scoring (max 12 tokens/row)</h3>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                  {CONVERSION_TABLE.map(({ marks, points }) => (
                    <div key={marks} className="rounded-lg bg-muted px-1 py-1.5 text-center">
                      <div className="text-[10px] font-semibold text-muted-foreground">{marks}X</div>
                      <div className="text-sm font-black tabular-nums">{points}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {ROWS.map((r) => (
                    <span key={r.key} className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", r.band)} />
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
