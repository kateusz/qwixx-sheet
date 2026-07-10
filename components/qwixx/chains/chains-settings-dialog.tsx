"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Moon, RotateCcw, Sun, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CONVERSION_TABLE, ROWS } from "@/lib/qwixx"

interface ChainsSettingsDialogProps {
  open: boolean
  name: string
  theme: "light" | "dark"
  onClose: () => void
  onNameChange: (name: string) => void
  onThemeToggle: () => void
  onReset: () => void
}

const RULES = [
  "Play with standard Qwixx rules: roll six dice, use the white sum (and optionally one white + one colored die on your turn).",
  "Numbers in each row must be crossed from left to right. Skipped numbers cannot be used later.",
  "The right-most number can only be crossed after five other numbers in that row. Doing so locks the row.",
  "Circled chain boxes are linked across adjacent rows (see the dashed connectors on the sheet).",
  "When you cross a chain box, you must automatically cross its linked partner — even if that breaks the left-to-right rule or the row is already locked.",
  "Taking no cross on your own turn costs a penalty of -5. The game ends after four penalties or once two rows are locked.",
]

export function ChainsSettingsDialog({
  open,
  name,
  theme,
  onClose,
  onNameChange,
  onThemeToggle,
  onReset,
}: ChainsSettingsDialogProps) {
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
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-black text-foreground">Settings</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div>
                <label htmlFor="chains-player-name" className="mb-1.5 block text-sm font-bold text-foreground">
                  Player name
                </label>
                <input
                  id="chains-player-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  maxLength={20}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Player"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onThemeToggle}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
                <button
                  type="button"
                  onClick={onReset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  New game
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Qwixx Chains — how to play
                </h3>
                <ol className="space-y-2">
                  {RULES.map((rule, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Scoring</h3>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                  {CONVERSION_TABLE.map(({ marks, points }) => (
                    <div key={marks} className="rounded-lg bg-muted px-1 py-1.5 text-center">
                      <div className="text-[10px] font-semibold text-muted-foreground">{marks}X</div>
                      <div className="text-sm font-black tabular-nums text-foreground">{points}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {ROWS.map((r) => (
                    <span key={r.key} className="flex items-center gap-1.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full", r.band)} />
                      {r.label}
                    </span>
                  ))}
                  <span>Penalty = -5 each</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
