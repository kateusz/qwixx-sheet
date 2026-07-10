"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { DiceRoller, type DiceRoll } from "./dice-roller"
import { RollChip } from "./roll-display"

interface DiceModalProps {
  open: boolean
  muted: boolean
  history: DiceRoll[]
  onClose: () => void
  onRoll: (roll: DiceRoll) => void
  onRollStart: () => void
}

export function DiceModal({ open, muted, history, onClose, onRoll, onRollStart }: DiceModalProps) {
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
          aria-label="Dice roller"
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl"
            initial={{ y: 60, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">Roll the dice</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <DiceRoller onRoll={onRoll} onRollStart={muted ? undefined : onRollStart} />

            {history.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent rolls</h3>
                <div className="flex flex-wrap gap-2">
                  {history.map((roll) => (
                    <div
                      key={roll.ts}
                      className="rounded-lg bg-muted/60 px-2 py-1 text-xs font-semibold"
                    >
                      <RollChip roll={roll} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
