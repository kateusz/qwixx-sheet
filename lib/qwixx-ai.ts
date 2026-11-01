import {
  type ClassicGameState,
  type ClassicMove,
  applyMark,
  afterColorAi,
  afterWhiteAi,
  getColorMoves,
  getWhiteSumMoves,
  randomRollValues,
  rollDice,
} from "./qwixx-classic-multi"
import { fastLookaheadPick, fastPick } from "./qwixx-ai/fastPolicy"
import { activeWeights } from "./qwixx-ai/heuristics"

export type AiDifficulty = "easy" | "normal" | "hard"

function easyPick(state: ClassicGameState, kind: "white" | "color"): ClassicMove | null {
  const moves = kind === "white" ? getWhiteSumMoves(state, "ai") : getColorMoves(state, "ai")
  if (Math.random() < 0.35) {
    if (moves.length === 0 || Math.random() < 0.25) return null
    return moves[Math.floor(Math.random() * moves.length)]!
  }
  return fastPick(state, "ai", kind, activeWeights())
}

export function aiPickWhiteSum(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  if (difficulty === "easy") return easyPick(state, "white")
  const w = activeWeights()
  if (difficulty === "hard") return fastLookaheadPick(state, "ai", "white", w, 3)
  return fastPick(state, "ai", "white", w)
}

export function aiPickColor(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  if (difficulty === "easy") return easyPick(state, "color")
  const w = activeWeights()
  if (difficulty === "hard") return fastLookaheadPick(state, "ai", "color", w, 3)
  return fastPick(state, "ai", "color", w)
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
