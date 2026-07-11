"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Dices } from "lucide-react"
import { cn } from "@/lib/utils"

interface DieDef {
  id: string
  color: string // tailwind bg
  textColor: string
}

const DICE: DieDef[] = [
  { id: "white1", color: "bg-card border-2 border-border", textColor: "text-foreground" },
  { id: "white2", color: "bg-card border-2 border-border", textColor: "text-foreground" },
  { id: "red", color: "bg-red-500", textColor: "text-white" },
  { id: "yellow", color: "bg-yellow-400", textColor: "text-white" },
  { id: "green", color: "bg-green-500", textColor: "text-white" },
  { id: "blue", color: "bg-blue-500", textColor: "text-white" },
]

/** Six dice faces only — no sums, labels, or combination hints (e.g. w3+y1=4). */
export function DiceFaces({ values, size = "sm" }: { values: number[]; size?: "sm" | "md" }) {
  const die = size === "md" ? "h-7 w-7 text-sm" : "h-5 w-5 text-xs"
  return (
    <div className="flex items-center gap-1 tabular-nums">
      {DICE.map((dieDef, i) => (
        <span
          key={dieDef.id}
          className={cn(
            "flex items-center justify-center rounded font-bold shadow-sm",
            die,
            dieDef.color,
            dieDef.textColor,
          )}
        >
          {values[i]}
        </span>
      ))}
    </div>
  )
}

const rand = () => Math.floor(Math.random() * 6) + 1

export interface DiceRoll {
  values: number[]
  whiteSum: number
  ts: number
}

export function DiceRoller({
  onRoll,
  onRollStart,
}: {
  onRoll?: (roll: DiceRoll) => void
  onRollStart?: () => void
}) {
  const [values, setValues] = useState<number[]>(() => DICE.map(() => rand()))
  const [rolling, setRolling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const roll = () => {
    if (rolling) return
    onRollStart?.()
    setRolling(true)
    intervalRef.current = setInterval(() => {
      setValues(DICE.map(() => rand()))
    }, 70)

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      const final = DICE.map(() => rand())
      setValues(final)
      setRolling(false)
      onRoll?.({
        values: final,
        whiteSum: final[0] + final[1],
        ts: Date.now(),
      })
    }, 750)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Dice</h2>
        <button
          type="button"
          onClick={roll}
          disabled={rolling}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <Dices className={cn("h-4 w-4", rolling && "animate-spin")} />
          {rolling ? "Rolling…" : "Roll"}
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:gap-3" style={{ perspective: 600 }}>
        {DICE.map((die, i) => (
          <motion.div
            key={die.id}
            animate={
              rolling
                ? { rotateX: [0, 360, 720], rotateY: [0, 180, 360] }
                : { rotateX: 0, rotateY: 0 }
            }
            transition={{ duration: 0.75, ease: "easeOut" }}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl text-xl font-black tabular-nums shadow-md sm:text-2xl",
              die.color,
              die.textColor,
            )}
          >
            {values[i]}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
