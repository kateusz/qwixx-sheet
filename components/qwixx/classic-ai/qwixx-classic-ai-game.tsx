"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw, Settings, Volume2, VolumeX } from "lucide-react"
import { ROWS, lockedRowCount, totalScore, type ColorKey } from "@/lib/qwixx"
import {
  applyMark,
  createClassicVsAi,
  endColorHuman,
  isValidMove,
  rollDice,
  skipWhiteHuman,
  type ClassicGameState,
} from "@/lib/qwixx-classic-multi"
import { runAiColor, runAiRoll, runAiWhiteSum, type AiDifficulty } from "@/lib/qwixx-ai"
import { sfx } from "@/lib/sound"
import { ScoreRow } from "../score-row"
import { VersionNav } from "../version-nav"
import { ClassicAiTurnPanel } from "./classic-ai-turn-panel"
import { ClassicAiEndModal } from "./classic-ai-end-modal"
import { ClassicAiSettingsDialog } from "./classic-ai-settings-dialog"

const STATE_KEY = "qwixx-classic-ai-v1"
const THEME_KEY = "qwixx-theme"
const MUTE_KEY = "qwixx-muted"

export function QwixxClassicAiGame() {
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<ClassicGameState>(() => createClassicVsAi())
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [muted, setMuted] = useState(false)
  const [difficulty, setDifficulty] = useState<AiDifficulty>("normal")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)

  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const play = useCallback((fn: () => void) => {
    if (!mutedRef.current) fn()
  }, [])

  const stateRef = useRef(state)
  stateRef.current = state
  const difficultyRef = useRef(difficulty)
  difficultyRef.current = difficulty

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as ClassicGameState & { difficulty?: AiDifficulty }
        if (saved?.human?.rows) {
          setState({
            ...saved,
            humanWhiteUsed: saved.humanWhiteUsed ?? false,
            aiWhiteUsed: saved.aiWhiteUsed ?? false,
            colorMoveUsed: saved.colorMoveUsed ?? false,
            turnPlaced: saved.turnPlaced ?? false,
          })
          if (saved.difficulty) setDifficulty(saved.difficulty)
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
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, difficulty }))
    } catch {
      /* ignore */
    }
  }, [state, difficulty, hydrated])

  const wasOver = useRef(false)
  useEffect(() => {
    if (state.phase === "ended" && !wasOver.current) {
      setDismissed(false)
      play(sfx.win)
    }
    wasOver.current = state.phase === "ended"
  }, [state.phase, play])

  // AI automation: roll, white sum, color move.
  useEffect(() => {
    if (state.phase === "ended") return

    let cancelled = false
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    async function runAi() {
      const s = stateRef.current
      if (s.phase === "roll" && s.active === "ai") {
        setAiThinking(true)
        await delay(500)
        if (cancelled) return
        play(sfx.roll)
        setState(runAiRoll(s))
        setAiThinking(false)
        return
      }
      if (s.phase === "whiteAi") {
        setAiThinking(true)
        await delay(400)
        if (cancelled) return
        const next = runAiWhiteSum(s, difficultyRef.current)
        if (next.ai.rows !== s.ai.rows || next.turnPlaced !== s.turnPlaced) play(sfx.mark)
        setState(next)
        setAiThinking(false)
        return
      }
      if (s.phase === "colorAi") {
        setAiThinking(true)
        await delay(400)
        if (cancelled) return
        const next = runAiColor(s, difficultyRef.current)
        if (next !== s) {
          if (!s.turnPlaced && next.turnPlaced) play(sfx.mark)
          else if (next.ai.penalties > s.ai.penalties) play(sfx.penalty)
          else play(sfx.mark)
        }
        setState(next)
        setAiThinking(false)
      }
    }

    void runAi()
    return () => {
      cancelled = true
    }
  }, [state.phase, state.active, play])

  function handleHumanRoll(values: number[]) {
    play(sfx.roll)
    setState((s) => rollDice(s, values))
  }

  function handleHumanMark(color: ColorKey, index: number) {
    if (!isValidMove(state, "human", color, index)) return
    const next = applyMark(state, "human", color, index)
    if (!next) return
    play(sfx.mark)

    if (next.phase === "ended") {
      setState(next)
      return
    }

    if (state.phase === "whiteHuman") {
      setState(skipWhiteHuman(next))
      return
    }

    if (state.phase === "colorHuman" && next.colorMoveUsed) {
      setState(endColorHuman(next))
      return
    }

    setState(next)
  }

  function handleSkipWhite() {
    setState((s) => skipWhiteHuman(s))
  }

  function handleEndTurn() {
    setState((s) => {
      if (!s.turnPlaced) play(sfx.penalty)
      return endColorHuman(s)
    })
  }

  function newGame() {
    setState(createClassicVsAi(state.human.name, state.ai.name))
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

  const gameOver = state.phase === "ended"
  const humanCanMark =
    !gameOver &&
    ((state.phase === "whiteHuman" && !state.humanWhiteUsed) ||
      (state.phase === "colorHuman" && state.active === "human" && !state.colorMoveUsed))

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-5 sm:py-8">
        <header className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black sm:text-4xl">Classic vs AI</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {gameOver
                ? "Game finished"
                : `${state.active === "human" ? "Your" : "AI's"} turn · You ${totalScore(state.human)} · AI ${totalScore(state.ai)}`}
            </p>
          </div>
          <VersionNav active="classic-ai" />
        </header>

        <PlayerBar state={state} />

        {!gameOver && (
          <ClassicAiTurnPanel
            state={state}
            aiThinking={aiThinking}
            onRoll={handleHumanRoll}
            onRollStart={() => play(sfx.roll)}
            onSkipWhite={handleSkipWhite}
            onEndTurn={handleEndTurn}
          />
        )}

        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Your sheet</h2>
          <Board player={state.human} disabled={!humanCanMark} onMark={handleHumanMark} />
        </section>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">AI sheet</h2>
          <Board player={state.ai} disabled onMark={() => {}} />
        </section>

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

      <ClassicAiSettingsDialog
        open={settingsOpen}
        humanName={state.human.name}
        difficulty={difficulty}
        theme={theme}
        onClose={() => setSettingsOpen(false)}
        onHumanNameChange={(name) => setState((s) => ({ ...s, human: { ...s.human, name } }))}
        onDifficultyChange={setDifficulty}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onReset={newGame}
      />

      <ClassicAiEndModal
        open={gameOver && !dismissed}
        state={state}
        onNewGame={newGame}
        onDismiss={() => setDismissed(true)}
      />
    </main>
  )
}

function PlayerBar({ state }: { state: ClassicGameState }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      {(["human", "ai"] as const).map((id) => {
        const p = id === "human" ? state.human : state.ai
        const active = state.active === id && state.phase !== "ended"
        return (
          <div
            key={id}
            className={`rounded-2xl border px-3 py-2.5 ${active ? "border-foreground bg-card shadow-sm" : "border-border bg-muted/40"}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">{p.name}</span>
              {active && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Turn
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground tabular-nums">
              <span>{totalScore(p)} pts</span>
              <span>{lockedRowCount(p)}/2 locks</span>
              <span>{p.penalties}/4 pen.</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Board({
  player,
  disabled,
  onMark,
}: {
  player: ClassicGameState["human"]
  disabled: boolean
  onMark: (color: ColorKey, index: number) => void
}) {
  return (
    <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      <div className="min-w-[560px] space-y-2 sm:min-w-0 sm:space-y-2.5">
        {ROWS.map((config) => (
          <ScoreRow
            key={config.key}
            config={config}
            row={player.rows[config.key]}
            disabled={disabled}
            onMark={(index) => onMark(config.key, index)}
          />
        ))}
      </div>
    </div>
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
