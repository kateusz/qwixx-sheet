import {
  type ClassicGameState,
  type ClassicMove,
  applyMark,
  afterColorAi,
  afterWhiteAi,
  getColorMoves,
  getWhiteSumMoves,
  playerRef,
  randomRollValues,
  rollDice,
} from "./qwixx-classic-multi"
import { totalScore } from "./qwixx"
import { classicToGameState, moveToClassic } from "./qwixx-ai/classicAdapter"
import { pickBestMove } from "./qwixx-ai/expectimax"
import { scoreMoveHardRules } from "./qwixx-ai/hardRules"
import { DEFAULT_WEIGHTS } from "./qwixx-ai/heuristics"
import type { Move } from "./qwixx-ai/gameState"

export type AiDifficulty = "easy" | "normal" | "hard"

const EXPECTIMAX_DEPTH: Record<AiDifficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
}

function scoreDelta(state: ClassicGameState, player: "ai", move: ClassicMove): number {
  const before = totalScore(playerRef(state, player))
  const next = applyMark(state, player, move.color, move.index)
  if (!next) return -Infinity
  return totalScore(playerRef(next, player)) - before
}

function rankMove(state: ClassicGameState, player: "ai", move: ClassicMove): number {
  let rank = scoreDelta(state, player, move)
  const p = playerRef(state, player)
  const len = p.rows[move.color].marks.length
  if (len === 4) rank += 8
  if (len >= 5) rank += 3

  const gs = classicToGameState(state, "ai")
  const aiMove: Move = { kind: "mark", color: move.color, index: move.index, number: move.number }
  rank += scoreMoveHardRules(gs, aiMove, DEFAULT_WEIGHTS)
  return rank
}

function pickBestGreedy(
  state: ClassicGameState,
  moves: ClassicMove[],
  minScore: number,
  difficulty: AiDifficulty,
): ClassicMove | null {
  if (moves.length === 0) return null
  const ranked = moves
    .map((m) => ({ m, rank: rankMove(state, "ai", m) }))
    .sort((a, b) => b.rank - a.rank)

  if (difficulty === "easy" && Math.random() < 0.35) {
    return ranked[Math.floor(Math.random() * ranked.length)]!.m
  }

  const best = ranked[0]!
  if (best.rank < minScore) return null
  return best.m
}

function pickExpectimax(
  state: ClassicGameState,
  phase: "white" | "color",
  difficulty: AiDifficulty,
): ClassicMove | null {
  const gs = classicToGameState(state, "ai")
  if (phase === "color") {
    gs.phase = "colorSelf"
    gs.selfWhiteUsed = true
  }
  const depth = EXPECTIMAX_DEPTH[difficulty]
  const sample = difficulty === "hard" ? 120 : 60
  const move = pickBestMove(gs, depth, phase === "color" || state.active === "ai", {
    weights: DEFAULT_WEIGHTS,
    chanceSampleSize: sample,
  })
  return moveToClassic(move)
}

export function aiPickWhiteSum(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  if (difficulty === "hard" || difficulty === "normal") {
    const move = pickExpectimax(state, "white", difficulty)
    if (move) return move
  }
  return pickBestGreedy(state, getWhiteSumMoves(state, "ai"), difficulty === "easy" ? 1 : 3, difficulty)
}

export function aiPickColor(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  if (difficulty === "hard" || difficulty === "normal") {
    const move = pickExpectimax(state, "color", difficulty)
    if (move) return move
  }
  return pickBestGreedy(state, getColorMoves(state, "ai"), difficulty === "easy" ? 0 : 1, difficulty)
}

export function runAiWhiteSum(state: ClassicGameState, difficulty: AiDifficulty): ClassicGameState {
  let next = state
  const move = aiPickWhiteSum(next, difficulty)
  if (move) next = applyMark(next, "ai", move.color, move.index) ?? next
  return afterWhiteAi(next)
}

export function runAiColor(state: ClassicGameState, difficulty: AiDifficulty): ClassicGameState {
  let next = state
  const move = aiPickColor(next, difficulty)
  if (move) next = applyMark(next, "ai", move.color, move.index) ?? next
  return afterColorAi(next)
}

export function runAiRoll(state: ClassicGameState): ClassicGameState {
  return rollDice(state, randomRollValues())
}

// ponytail: minimal self-check
if (typeof process !== "undefined" && process.argv[1]?.endsWith("qwixx-ai.ts")) {
  const { createClassicVsAi, rollDice: roll } = require("./qwixx-classic-multi") as typeof import("./qwixx-classic-multi")
  let s = roll(createClassicVsAi(), [2, 3, 1, 4, 5, 6])
  s = { ...s, phase: "whiteAi" }
  const m = aiPickWhiteSum(s, "hard")
  console.assert(m === null || m.color !== undefined, "hard AI returns move or null")
}
