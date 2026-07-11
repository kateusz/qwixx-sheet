"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Moon, RotateCcw, Sun, X } from "lucide-react"
import { CONVERSION_TABLE, ROWS } from "@/lib/qwixx"
import type { AiDifficulty } from "@/lib/qwixx-ai"

interface ClassicAiSettingsDialogProps {
  open: boolean
  humanName: string
  difficulty: AiDifficulty
  theme: "light" | "dark"
  onClose: () => void
  onHumanNameChange: (name: string) => void
  onDifficultyChange: (d: AiDifficulty) => void
  onThemeToggle: () => void
  onReset: () => void
}

const RULES = [
  "On your turn, roll all six dice. Everyone may optionally use the white sum on their own sheet.",
  "The active player may also combine one white die with one color die in that color's row.",
  "If the active player marks nothing on their turn, they take a −5 penalty.",
  "Numbers must be crossed left to right. Lock a row by crossing the last number after five other crosses.",
  "The game ends when any player locks two rows or reaches four penalties.",
  "Highest total score wins.",
]

export function ClassicAiSettingsDialog({
  open,
  humanName,
  difficulty,
  theme,
  onClose,
  onHumanNameChange,
  onDifficultyChange,
  onThemeToggle,
  onReset,
}: ClassicAiSettingsDialogProps) {
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
          aria-label="Settings"
        >
          <motion.div
            className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl"
            initial={{ y: 60, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Settings</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Your name</span>
              <input
                value={humanName}
                onChange={(e) => onHumanNameChange(e.target.value)}
                maxLength={16}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div className="mb-4">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">AI difficulty</span>
              <div className="flex gap-2">
                {(["easy", "normal"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDifficultyChange(d)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold capitalize ${difficulty === d ? "border-foreground bg-muted" : "border-border"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 flex gap-2">
              <button type="button" onClick={onThemeToggle} className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button type="button" onClick={onReset} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground">
                <RotateCcw className="h-4 w-4" />
                New game
              </button>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Rules</h3>
              <ul className="space-y-2">
                {RULES.map((rule, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
                    <span className="font-bold text-muted-foreground">{i + 1}.</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Scoring</h3>
              <div className="grid grid-cols-6 gap-1">
                {CONVERSION_TABLE.slice(0, 6).map(({ marks, points }) => (
                  <div key={marks} className="rounded-lg bg-muted px-1 py-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground">{marks}×</div>
                    <div className="text-xs font-bold">{points}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {ROWS.map((r) => (
                  <span key={r.key} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${r.band}`} />
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
