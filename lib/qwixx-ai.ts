import {
  type ClassicGameState,
  type ClassicMove,
  type ClassicPlayerId,
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

export type AiDifficulty = "easy" | "normal"

function scoreDelta(state: ClassicGameState, player: ClassicPlayerId, move: ClassicMove): number {
  const before = totalScore(playerRef(state, player))
  const next = applyMark(state, player, move.color, move.index)
  if (!next) return -Infinity
  return totalScore(playerRef(next, player)) - before
}

function rankMove(state: ClassicGameState, player: ClassicPlayerId, move: ClassicMove): number {
  let rank = scoreDelta(state, player, move)
  const p = playerRef(state, player)
  const len = p.rows[move.color].marks.length
  if (len === 4) rank += 8
  if (len >= 5) rank += 3
  return rank
}

function pickBest(
  state: ClassicGameState,
  player: ClassicPlayerId,
  moves: ClassicMove[],
  minScore: number,
  difficulty: AiDifficulty,
): ClassicMove | null {
  if (moves.length === 0) return null
  const ranked = moves
    .map((m) => ({ m, rank: rankMove(state, player, m) }))
    .sort((a, b) => b.rank - a.rank)

  if (difficulty === "easy" && Math.random() < 0.35) {
    return ranked[Math.floor(Math.random() * ranked.length)]!.m
  }

  const best = ranked[0]!
  if (best.rank < minScore) return null
  return best.m
}

export function aiPickWhiteSum(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  return pickBest(state, "ai", getWhiteSumMoves(state, "ai"), difficulty === "easy" ? 1 : 3, difficulty)
}

export function aiPickColor(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  return pickBest(state, "ai", getColorMoves(state, "ai"), difficulty === "easy" ? 0 : 1, difficulty)
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
