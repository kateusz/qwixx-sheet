"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  createPlayer,
  isGameOver,
  lockedRowCount,
  MAX_PENALTIES,
  ROWS,
  willLockRow,
  type ColorKey,
  type PlayerState,
} from "@/lib/qwixx"
import { sfx } from "@/lib/sound"
import { ScoreRow } from "./score-row"
import { BottomBar } from "./bottom-bar"
import { SettingsDialog } from "./settings-dialog"
import { DiceModal } from "./dice-modal"
import { EndGameModal } from "./end-game-modal"
import type { DiceRoll } from "./dice-roller"

const STATE_KEY = "qwixx-session-v2"
const THEME_KEY = "qwixx-theme"
const MUTE_KEY = "qwixx-muted"

export function QwixxGame() {
  const [hydrated, setHydrated] = useState(false)
  const [player, setPlayer] = useState<PlayerState>(() => createPlayer("Player"))
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [muted, setMuted] = useState(false)
  const [diceHistory, setDiceHistory] = useState<DiceRoll[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const play = useCallback((fn: () => void) => {
    if (!mutedRef.current) fn()
  }, [])

  // Hydrate from localStorage (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as PlayerState
        if (saved?.rows) {
          setPlayer(saved)
          setDismissed(isGameOver(saved))
        }
      }
    } catch {
      /* ignore */
    }

    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme)
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
    }
    setMuted(localStorage.getItem(MUTE_KEY) === "1")
    setHydrated(true)
  }, [])

  // Apply + persist theme.
  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme, hydrated])

  // Persist mute preference.
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0")
  }, [muted, hydrated])

  // Persist the session (the game state).
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(player))
    } catch {
      /* ignore quota errors */
    }
  }, [player, hydrated])

  const gameOver = useMemo(() => isGameOver(player), [player])
  const reason: "locks" | "penalties" | null = gameOver
    ? player.penalties >= MAX_PENALTIES
      ? "penalties"
      : "locks"
    : null

  const wasOver = useRef(false)
  useEffect(() => {
    if (gameOver && !wasOver.current) {
      setDismissed(false)
      play(sfx.win)
    }
    wasOver.current = gameOver
  }, [gameOver, play])

  function markCell(color: ColorKey, index: number) {
    if (gameOver) return
    const rowLen = ROWS.find((r) => r.key === color)!.numbers.length
    const locks = willLockRow(player.rows[color], index, rowLen)
    setPlayer((p) => {
      const row = p.rows[color]
      if (row.locked || row.marks.includes(index)) return p
      return {
        ...p,
        rows: { ...p.rows, [color]: { marks: [...row.marks, index], locked: locks || row.locked } },
      }
    })
    play(locks ? sfx.lock : sfx.mark)
  }

  function setPenalties(count: number) {
    if (gameOver) return
    setPlayer((p) => {
      if (count > p.penalties) play(sfx.penalty)
      return { ...p, penalties: count }
    })
  }

  function setName(name: string) {
    setPlayer((p) => ({ ...p, name }))
  }

  function newGame() {
    setPlayer((p) => ({ ...createPlayer(p.name || "Player"), id: p.id }))
    setDiceHistory([])
    setDismissed(false)
    setSettingsOpen(false)
    setResetKey((k) => k + 1)
    wasOver.current = false
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  const locks = lockedRowCount(player)

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-5 sm:py-8">
        {/* Header */}
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-balance sm:text-4xl">Qwixx</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {gameOver ? "Game finished" : `${player.name} · ${locks}/2 rows locked · ${player.penalties}/4 penalties`}
            </p>
          </div>
        </header>

        {/* Board (horizontally scrollable on small screens to keep touch targets usable) */}
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={resetKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="min-w-[560px] space-y-2 sm:min-w-0 sm:space-y-2.5"
            >
              {ROWS.map((config) => (
                <ScoreRow
                  key={config.key}
                  config={config}
                  row={player.rows[config.key]}
                  disabled={gameOver}
                  onMark={(index) => markCell(config.key, index)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <BottomBar
          player={player}
          muted={muted}
          disabled={gameOver}
          onOpenSettings={() => setSettingsOpen(true)}
          onReset={newGame}
          onToggleMute={() => setMuted((m) => !m)}
          onOpenDice={() => setDiceOpen(true)}
          onSetPenalties={setPenalties}
        />

        <footer className="mt-6 text-center text-xs text-muted-foreground text-pretty">
          Tap the gear for the full rules. Your card is saved automatically to this device.
        </footer>
      </div>

      <SettingsDialog
        open={settingsOpen}
        name={player.name}
        theme={theme}
        onClose={() => setSettingsOpen(false)}
        onNameChange={setName}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onReset={newGame}
      />

      <DiceModal
        open={diceOpen}
        muted={muted}
        history={diceHistory}
        onClose={() => setDiceOpen(false)}
        onRoll={(roll) => setDiceHistory((prev) => [roll, ...prev].slice(0, 6))}
        onRollStart={() => play(sfx.roll)}
      />

      <EndGameModal
        open={gameOver && !dismissed}
        player={player}
        reason={reason}
        onNewGame={newGame}
        onDismiss={() => setDismissed(true)}
      />
    </main>
  )
}
