"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  createPlayer,
  isGameOver,
  lockedRowCount,
  MAX_PENALTIES,
  type ColorKey,
  type PlayerState,
} from "@/lib/qwixx"
import { applyCellToggle } from "@/lib/qwixx-chains"
import { sfx } from "@/lib/sound"
import { BottomBar } from "../bottom-bar"
import { DiceModal } from "../dice-modal"
import { EndGameModal } from "../end-game-modal"
import { LastRollBanner } from "../roll-display"
import { VersionNav } from "../version-nav"
import { ChainBoard } from "./chain-board"
import { ChainsSettingsDialog } from "./chains-settings-dialog"
import type { DiceRoll } from "../dice-roller"

const STATE_KEY = "qwixx-chains-session-v1"
const THEME_KEY = "qwixx-theme"
const MUTE_KEY = "qwixx-muted"

export function QwixxChainsGame() {
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

  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0")
  }, [muted, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(player))
    } catch {
      /* ignore */
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
    const unmarking = player.rows[color].marks.includes(index)
    const lockedBefore = lockedRowCount(player)
    const next = applyCellToggle(player, color, index)
    if (next === player) return

    play(unmarking ? sfx.mark : lockedRowCount(next) > lockedBefore ? sfx.lock : sfx.mark)
    setPlayer(next)
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
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-balance sm:text-4xl">Qwixx Chains</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {gameOver ? "Game finished" : `${player.name} · ${locks}/2 rows locked · ${player.penalties}/4 penalties`}
            </p>
          </div>
          <VersionNav active="chains" />
        </header>

        {diceHistory[0] && <LastRollBanner roll={diceHistory[0]} />}

        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={resetKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="min-w-[560px] sm:min-w-0"
            >
              <ChainBoard rows={player.rows} disabled={gameOver} onMark={markCell} />
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
          Cross a chain box to auto-mark its linked partner. Tap the gear for full rules.
        </footer>
      </div>

      <ChainsSettingsDialog
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
