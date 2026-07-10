"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Moon, RotateCcw, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createPlayer,
  getWinners,
  isGameOver,
  lockedRowCount,
  ROWS,
  type ColorKey,
  type PlayerState,
} from "@/lib/qwixx"
import { ScoreRow } from "./score-row"
import { DiceRoller, type DiceRoll } from "./dice-roller"
import { PenaltyBox } from "./penalty-box"
import { ScoreSummary } from "./score-summary"
import { PlayerTabs } from "./player-tabs"
import { EndGameModal } from "./end-game-modal"

const STATE_KEY = "qwixx-state-v1"
const THEME_KEY = "qwixx-theme"

interface SavedState {
  players: PlayerState[]
  activeId: string
}

export function QwixxGame() {
  const [hydrated, setHydrated] = useState(false)
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [activeId, setActiveId] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [diceHistory, setDiceHistory] = useState<DiceRoll[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [direction, setDirection] = useState(1)
  const prevIndex = useRef(0)

  // Hydrate from localStorage (client only) to avoid SSR id mismatch.
  useEffect(() => {
    let loaded: SavedState | null = null
    try {
      const raw = localStorage.getItem(STATE_KEY)
      if (raw) loaded = JSON.parse(raw)
    } catch {
      loaded = null
    }
    if (loaded && loaded.players?.length) {
      setPlayers(loaded.players)
      setActiveId(loaded.activeId && loaded.players.some((p) => p.id === loaded!.activeId) ? loaded.activeId : loaded.players[0].id)
      setDismissed(isGameOver(loaded.players))
    } else {
      const fresh = [createPlayer("Player 1"), createPlayer("Player 2")]
      setPlayers(fresh)
      setActiveId(fresh[0].id)
    }

    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme)
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
    }
    setHydrated(true)
  }, [])

  // Apply theme to <html>.
  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme, hydrated])

  // Persist game state.
  useEffect(() => {
    if (!hydrated || !players.length) return
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ players, activeId }))
    } catch {
      /* ignore quota errors */
    }
  }, [players, activeId, hydrated])

  const gameOver = useMemo(() => isGameOver(players), [players])
  const winners = useMemo(() => (players.length ? getWinners(players) : []), [players])

  // Open modal automatically when the game ends.
  useEffect(() => {
    if (gameOver) setDismissed(false)
  }, [gameOver])

  const activePlayer = players.find((p) => p.id === activeId)

  function updateActive(fn: (p: PlayerState) => PlayerState) {
    setPlayers((prev) => prev.map((p) => (p.id === activeId ? fn(p) : p)))
  }

  function markCell(color: ColorKey, index: number) {
    if (gameOver) return
    updateActive((p) => {
      const row = p.rows[color]
      if (row.locked || row.marks.includes(index)) return p
      return { ...p, rows: { ...p.rows, [color]: { ...row, marks: [...row.marks, index] } } }
    })
  }

  function lockRow(color: ColorKey) {
    if (gameOver) return
    updateActive((p) => {
      const row = p.rows[color]
      return { ...p, rows: { ...p.rows, [color]: { ...row, locked: true } } }
    })
  }

  function setPenalties(count: number) {
    if (gameOver) return
    updateActive((p) => ({ ...p, penalties: count }))
  }

  function selectPlayer(id: string) {
    const nextIdx = players.findIndex((p) => p.id === id)
    setDirection(nextIdx > prevIndex.current ? 1 : -1)
    prevIndex.current = nextIdx
    setActiveId(id)
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, createPlayer(`Player ${prev.length + 1}`)])
  }

  function removePlayer(id: string) {
    setPlayers((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (id === activeId && next.length) setActiveId(next[0].id)
      return next
    })
  }

  function newGame() {
    setPlayers((prev) => prev.map((p) => ({ ...createPlayer(p.name), id: p.id })))
    setDiceHistory([])
    setDismissed(false)
    setResetKey((k) => k + 1)
  }

  if (!hydrated || !activePlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  const locks = lockedRowCount(activePlayer)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div
        className="mx-auto max-w-3xl px-4 py-6 sm:py-8"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 31px, var(--border) 31px, var(--border) 32px)",
          backgroundAttachment: "local",
        }}
      >
        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-balance sm:text-3xl">
              Qwixx <span className="text-muted-foreground">Score Sheet</span>
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {gameOver ? "Game finished" : `${activePlayer.name}'s card · ${locks}/2 rows locked`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={newGame}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              New Game
            </button>
          </div>
        </header>

        {/* Player tabs */}
        <div className="mb-4">
          <PlayerTabs
            players={players}
            activeId={activeId}
            disabled={false}
            onSelect={selectPlayer}
            onAdd={addPlayer}
            onRemove={removePlayer}
          />
        </div>

        {/* The card (animated on player switch + new game) */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${activeId}-${resetKey}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="space-y-3"
            >
              {ROWS.map((config) => (
                <ScoreRow
                  key={config.key}
                  config={config}
                  row={activePlayer.rows[config.key]}
                  disabled={gameOver}
                  onMark={(index) => markCell(config.key, index)}
                  onLock={() => lockRow(config.key)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PenaltyBox penalties={activePlayer.penalties} disabled={gameOver} onToggle={setPenalties} />
          <DiceRoller onRoll={(roll) => setDiceHistory((prev) => [roll, ...prev].slice(0, 8))} />
        </div>

        <div className="mt-3">
          <ScoreSummary player={activePlayer} />
        </div>

        {/* Dice history */}
        {diceHistory.length > 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Roll history</h2>
            <div className="flex flex-wrap gap-2">
              {diceHistory.map((roll) => (
                <div
                  key={roll.ts}
                  className="flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-xs font-semibold tabular-nums"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-card text-foreground shadow-sm">
                    {roll.values[0]}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-card text-foreground shadow-sm">
                    {roll.values[1]}
                  </span>
                  <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-white">{roll.values[2]}</span>
                  <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-white">{roll.values[3]}</span>
                  <span className="rounded bg-green-500 px-1.5 py-0.5 text-white">{roll.values[4]}</span>
                  <span className="rounded bg-blue-500 px-1.5 py-0.5 text-white">{roll.values[5]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-6 text-center text-xs text-muted-foreground">
          Mark numbers left → right (red/yellow) or right → left (green/blue). Lock a row after 5 marks. Game ends at 2
          locked rows or 4 penalties.
        </footer>
      </div>

      <EndGameModal
        open={gameOver && !dismissed}
        players={players}
        winners={winners}
        onNewGame={newGame}
        onDismiss={() => setDismissed(true)}
      />
    </main>
  )
}
