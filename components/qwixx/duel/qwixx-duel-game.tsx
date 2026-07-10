"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw, Settings, Volume2, VolumeX } from "lucide-react"
import {
  applyPlacement,
  createDuelState,
  finishTurn,
  placementKindAt,
  type DuelState,
} from "@/lib/qwixx-duel"
import type { ColorKey } from "@/lib/qwixx"
import { sfx } from "@/lib/sound"
import { VersionNav } from "../version-nav"
import { DuelBoard, PlayerStatusBar } from "./duel-board"
import { DuelEndModal } from "./duel-end-modal"
import { DuelSettingsDialog } from "./duel-settings-dialog"
import { DuelTurnPanel, duelHighlights, numberAt } from "./duel-turn-panel"

const STATE_KEY = "qwixx-duel-session-v1"
const THEME_KEY = "qwixx-theme"
const MUTE_KEY = "qwixx-muted"

export function QwixxDuelGame() {
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<DuelState>(() => createDuelState())
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [muted, setMuted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const play = useCallback((fn: () => void) => {
    if (!mutedRef.current) fn()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as DuelState
        if (saved?.rows) {
          setState({ ...saved, misthrowOwners: saved.misthrowOwners ?? [], turnPlaced: saved.turnPlaced ?? false })
        }
      }
    } catch {
      /* ignore */
    }
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme)
    else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) setTheme("dark")
    setMuted(localStorage.getItem(MUTE_KEY) === "1")
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0")
  }, [muted, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, hydrated])

  const wasOver = useRef(false)
  useEffect(() => {
    if (state.phase === "ended" && !wasOver.current) {
      setDismissed(false)
      play(sfx.win)
    }
    wasOver.current = state.phase === "ended"
  }, [state.phase, play])

  function handleRoll(roll: DuelState["roll"]) {
    play(sfx.roll)
    setState((s) => ({ ...s, roll, phase: "action1" }))
  }

  function handlePlace(color: ColorKey, index: number) {
    if (!state.roll || state.phase === "roll" || state.phase === "ended") return
    const num = numberAt(state, color, index)
    const next = applyPlacement(state, state.active, color, index, num)
    if (!next) return
    play(sfx.mark)

    if (next.phase === "ended") {
      setState(next)
      return
    }

    if (state.phase === "action1") {
      const kind = placementKindAt(state, state.active, color, index, num)!
      setState({ ...next, action1: { color, index, kind }, turnPlaced: true, phase: "action2" })
      return
    }

    setState(finishTurn({ ...next, turnPlaced: true }, true))
  }

  function handleSkipAction1() {
    setState((s) => ({ ...s, phase: "action2" }))
  }

  function handleEndTurn() {
    setState((s) => {
      if (!s.turnPlaced) play(sfx.penalty)
      return finishTurn(s, s.turnPlaced)
    })
  }

  function newGame() {
    setState((s) =>
      createDuelState(s.p1.name || "Player 1", s.p2.name || "Player 2"),
    )
    setDismissed(false)
    setSettingsOpen(false)
    wasOver.current = false
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  const highlights = duelHighlights(state)
  const gameOver = state.phase === "ended"

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-5 sm:py-8">
        <header className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black sm:text-4xl">Qwixx Duel</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">Two players · one phone</p>
          </div>
          <VersionNav active="duel" />
        </header>

        <PlayerStatusBar state={state} />

        {!gameOver && (
          <DuelTurnPanel
            state={state}
            onRoll={handleRoll}
            onRollStart={() => play(sfx.roll)}
            onSkipAction1={handleSkipAction1}
            onEndTurn={handleEndTurn}
          />
        )}

        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <div className="min-w-[560px] sm:min-w-0">
            <DuelBoard
              state={state}
              highlights={highlights}
              onPlace={handlePlace}
              disabled={gameOver || state.phase === "roll"}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <ToolbarButton label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </ToolbarButton>
          <ToolbarButton label="New game" onClick={newGame}>
            <RotateCcw className="h-5 w-5" />
          </ToolbarButton>
          <ToolbarButton label="Mute" onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </ToolbarButton>
        </div>
      </div>

      <DuelSettingsDialog
        open={settingsOpen}
        p1Name={state.p1.name}
        p2Name={state.p2.name}
        theme={theme}
        onClose={() => setSettingsOpen(false)}
        onP1NameChange={(name) => setState((s) => ({ ...s, p1: { ...s.p1, name } }))}
        onP2NameChange={(name) => setState((s) => ({ ...s, p2: { ...s.p2, name } }))}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onReset={newGame}
      />

      <DuelEndModal
        open={gameOver && !dismissed}
        state={state}
        onNewGame={newGame}
        onDismiss={() => setDismissed(true)}
      />
    </main>
  )
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
    >
      {children}
    </button>
  )
}
