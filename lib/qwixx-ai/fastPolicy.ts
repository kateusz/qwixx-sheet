import { canMarkCell, type ColorKey, type PlayerState } from "../qwixx"
import {
  afterColorAi,
  afterWhiteAi,
  applyMark,
  endColorHuman,
  getColorMoves,
  getWhiteSumMoves,
  playerRef,
  rollDice,
  skipWhiteHuman,
  type ClassicGameState,
  type ClassicMove,
  type ClassicPlayerId,
} from "../qwixx-classic-multi"
import { shapeMark } from "./hardRules"
import { activeWeights, evaluatePlayers, type HeuristicWeights } from "./heuristics"

export function makeRng(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function applyLocal(p: PlayerState, color: ColorKey, index: number): PlayerState | null {
  const len = 11
  const row = p.rows[color]
  if (!canMarkCell(row, index, len)) return null
  return {
    ...p,
    rows: {
      ...p.rows,
      [color]: { marks: [...row.marks, index], locked: index === len - 1 },
    },
  }
}

/** One-ply pick. Null means skip. */
export function fastPick(
  state: ClassicGameState,
  player: ClassicPlayerId,
  kind: "white" | "color",
  weights: HeuristicWeights = activeWeights(),
): ClassicMove | null {
  const moves = kind === "white" ? getWhiteSumMoves(state, player) : getColorMoves(state, player)
  const me = playerRef(state, player)
  const opp = playerRef(state, player === "ai" ? "human" : "ai")
  const base = evaluatePlayers(me, opp, weights)
  const alreadyPlaced = state.turnPlaced && state.active === player

  let skipVal = weights.passWhite
  if (kind === "color") {
    skipVal = alreadyPlaced
      ? weights.passColor
      : evaluatePlayers({ ...me, penalties: me.penalties + 1 }, opp, weights) - base
  }

  let bestMark: ClassicMove | null = null
  let bestVal = -Infinity
  for (const m of moves) {
    const next = applyLocal(me, m.color, m.index)
    if (!next) continue
    const v = evaluatePlayers(next, opp, weights) - base + shapeMark(me, m.color, m.index, m.number, weights)
    if (v > bestVal) {
      bestVal = v
      bestMark = m
    }
  }

  // Active player on 3 misses: any color mark beats the game-ending 4th penalty.
  if (kind === "color" && me.penalties >= 3 && !alreadyPlaced && bestMark) return bestMark
  if (bestMark && bestVal > skipVal) return bestMark
  return null
}

function die(rng: () => number): number {
  return 1 + Math.floor(rng() * 6)
}

/** Advance one phase, both seats playing `weights`. */
function stepBoth(state: ClassicGameState, w: HeuristicWeights, rng: () => number): ClassicGameState {
  if (state.phase === "ended") return state
  if (state.phase === "roll") return rollDice(state, [die(rng), die(rng), die(rng), die(rng), die(rng), die(rng)])
  if (state.phase === "whiteHuman") {
    const m = fastPick(state, "human", "white", w)
    const s = m ? (applyMark(state, "human", m.color, m.index) ?? state) : state
    return skipWhiteHuman(s)
  }
  if (state.phase === "whiteAi") {
    const m = fastPick(state, "ai", "white", w)
    const s = m ? (applyMark(state, "ai", m.color, m.index) ?? state) : state
    return afterWhiteAi(s)
  }
  if (state.phase === "colorHuman") {
    const m = state.active === "human" ? fastPick(state, "human", "color", w) : null
    const s = m ? (applyMark(state, "human", m.color, m.index) ?? state) : state
    return endColorHuman(s)
  }
  if (state.phase === "colorAi") {
    const m = state.active === "ai" ? fastPick(state, "ai", "color", w) : null
    const s = m ? (applyMark(state, "ai", m.color, m.index) ?? state) : state
    return afterColorAi(s)
  }
  return state
}

function seedFrom(state: ClassicGameState): number {
  const v = state.roll?.values ?? [1, 2, 3, 4, 5, 6]
  let seed = 17
  for (let i = 0; i < v.length; i++) seed = (seed * 33 + v[i]! * (i + 1)) >>> 0
  return (seed + state.ai.penalties * 13 + state.human.penalties * 29 + state.ai.rows.red.marks.length) >>> 0
}

/**
 * Hard mode: same evaluator, but each candidate is scored by finishing this
 * round and playing one more round. Samples stay tiny so a turn stays under ~50ms.
 */
export function fastLookaheadPick(
  state: ClassicGameState,
  player: ClassicPlayerId,
  kind: "white" | "color",
  weights: HeuristicWeights = activeWeights(),
  samples = 3,
): ClassicMove | null {
  const moves = kind === "white" ? getWhiteSumMoves(state, player) : getColorMoves(state, player)
  const options: (ClassicMove | null)[] = [null, ...moves]
  const baseSeed = seedFrom(state) || 1
  let best: ClassicMove | null = null
  let bestScore = -Infinity

  for (const option of options) {
    let sum = 0
    for (let i = 0; i < samples; i++) {
      const rng = makeRng(baseSeed + i * 997)
      let s = state
      if (option) s = applyMark(s, player, option.color, option.index) ?? s
      s = kind === "white" ? (player === "human" ? skipWhiteHuman(s) : afterWhiteAi(s)) : player === "human" ? endColorHuman(s) : afterColorAi(s)

      for (let step = 0; step < 8 && s.phase !== "ended" && s.phase !== "roll"; step++) s = stepBoth(s, weights, rng)
      if (s.phase === "roll") {
        s = stepBoth(s, weights, rng)
        for (let step = 0; step < 8 && s.phase !== "ended" && s.phase !== "roll"; step++) s = stepBoth(s, weights, rng)
      }
      const me = playerRef(s, player)
      const opp = playerRef(s, player === "ai" ? "human" : "ai")
      sum += evaluatePlayers(me, opp, weights)
    }
    const avg = sum / samples
    if (avg > bestScore) {
      bestScore = avg
      best = option
    }
  }
  return best
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("fastPolicy.ts")) {
  const { createClassicVsAi, rollDice: roll } = require("../qwixx-classic-multi") as typeof import("../qwixx-classic-multi")
  const { DEFAULT_WEIGHTS } = require("./heuristics") as typeof import("./heuristics")

  let s = roll(createClassicVsAi(), [6, 6, 1, 1, 1, 1])
  s = { ...s, phase: "whiteAi" }
  const open = fastPick(s, "ai", "white", DEFAULT_WEIGHTS)
  console.assert(open?.number === 12 && (open.color === "green" || open.color === "blue"), "white 12 starts green/blue", open)

  s = roll(createClassicVsAi(), [5, 6, 1, 1, 1, 1])
  s = { ...s, phase: "whiteAi" }
  const eleven = fastPick(s, "ai", "white", DEFAULT_WEIGHTS)
  console.assert(!eleven || eleven.color === "green" || eleven.color === "blue", "white 11 does not jump red/yellow", eleven)

  s = roll(createClassicVsAi(), [6, 6, 1, 1, 1, 1])
  s.ai.rows.red.marks = [0, 1, 2, 3, 4]
  s = { ...s, phase: "whiteAi" }
  const lock = fastPick(s, "ai", "white", DEFAULT_WEIGHTS)
  console.assert(lock?.color === "red" && lock.number === 12, "locks red on 12 after five marks", lock)

  console.log("fastPolicy ok", { open, eleven, lock })
}
