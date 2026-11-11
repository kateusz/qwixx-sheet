import { totalScore } from "../qwixx"
import {
  afterColorAi,
  afterWhiteAi,
  applyMark,
  createClassicVsAi,
  endColorHuman,
  finishTurn,
  getColorMoves,
  getWhiteSumMoves,
  randomRollValues,
  rollDice,
  skipWhiteHuman,
  type ClassicGameState,
  type ClassicMove,
  type ClassicPlayerId,
} from "../qwixx-classic-multi"
import { pickBestMove } from "./expectimax"
import { classicToGameState, moveToClassic } from "./classicAdapter"
import { DEFAULT_WEIGHTS, type HeuristicWeights } from "./heuristics"

export interface SelfPlayResult {
  games: number
  aiWins: number
  greedyWins: number
  ties: number
  avgAiScore: number
  avgGreedyScore: number
  avgAiMargin: number
}

function pickGreedy(
  state: ClassicGameState,
  player: ClassicPlayerId,
  phase: "white" | "color",
): ClassicMove | null {
  const whitePhase = player === "human" ? "whiteHuman" : "whiteAi"
  const colorPhase = player === "human" ? "colorHuman" : "colorAi"
  const view = { ...state, phase: phase === "white" ? whitePhase : colorPhase } as ClassicGameState
  const moves = phase === "white" ? getWhiteSumMoves(view, player) : getColorMoves(view, player)
  if (moves.length === 0) return null

  let best: ClassicMove | null = null
  let bestScore = -Infinity
  for (const m of moves) {
    const next = applyMark(view, player, m.color, m.index)
    if (!next) continue
    const score = totalScore(player === "human" ? next.human : next.ai)
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

function runWhite(state: ClassicGameState, player: ClassicPlayerId, smart: boolean, depth: number, weights: HeuristicWeights): ClassicGameState {
  if (smart) {
    const gs = classicToGameState(state, player)
    const move = pickBestMove(gs, depth, state.active === player, { weights, chanceSampleSize: 80 })
    const classic = moveToClassic(move)
    if (classic) return applyMark(state, player, classic.color, classic.index) ?? state
    return state
  }
  const move = pickGreedy(state, player, "white")
  if (!move) return state
  return applyMark(state, player, move.color, move.index) ?? state
}

function runColor(state: ClassicGameState, player: ClassicPlayerId, smart: boolean, depth: number, weights: HeuristicWeights): ClassicGameState {
  if (smart) {
    const gs = classicToGameState(state, player)
    gs.phase = "colorSelf"
    gs.selfWhiteUsed = true
    const move = pickBestMove(gs, depth, true, { weights, chanceSampleSize: 80 })
    const classic = moveToClassic(move)
    if (classic) return applyMark(state, player, classic.color, classic.index) ?? state
    return state
  }
  const move = pickGreedy(state, player, "color")
  if (!move) return state
  return applyMark(state, player, move.color, move.index) ?? state
}

function playOneGame(expectimaxAs: ClassicPlayerId, depth: number, weights: HeuristicWeights): { aiScore: number; greedyScore: number } {
  let state = createClassicVsAi("Greedy", "Expectimax")

  while (state.phase !== "ended") {
    if (state.phase === "roll") {
      state = rollDice(state, randomRollValues())
      continue
    }

    if (state.phase === "whiteHuman") {
      state = runWhite(state, "human", expectimaxAs === "human", depth, weights)
      state = skipWhiteHuman(state)
      continue
    }

    if (state.phase === "whiteAi") {
      state = runWhite(state, "ai", expectimaxAs === "ai", depth, weights)
      state = afterWhiteAi(state)
      continue
    }

    if (state.phase === "colorHuman" && state.active === "human") {
      state = runColor(state, "human", expectimaxAs === "human", depth, weights)
      state = endColorHuman(state)
      continue
    }

    if (state.phase === "colorAi" && state.active === "ai") {
      state = runColor(state, "ai", expectimaxAs === "ai", depth, weights)
      state = afterColorAi(state)
      continue
    }

    state = finishTurn(state)
  }

  const greedyScore = totalScore(expectimaxAs === "ai" ? state.human : state.ai)
  const aiScore = totalScore(expectimaxAs === "ai" ? state.ai : state.human)
  return { aiScore, greedyScore }
}

/** Monte Carlo comparison: expectimax AI vs greedy rule-based bot. */
export function runSelfPlaySimulation(
  n: number,
  depth = 2,
  weights: HeuristicWeights = DEFAULT_WEIGHTS,
): SelfPlayResult {
  let aiWins = 0
  let greedyWins = 0
  let ties = 0
  let sumAi = 0
  let sumGreedy = 0

  for (let i = 0; i < n; i++) {
    const { aiScore, greedyScore } = playOneGame("ai", depth, weights)
    sumAi += aiScore
    sumGreedy += greedyScore
    if (aiScore > greedyScore) aiWins++
    else if (greedyScore > aiScore) greedyWins++
    else ties++
  }

  return {
    games: n,
    aiWins,
    greedyWins,
    ties,
    avgAiScore: sumAi / n,
    avgGreedyScore: sumGreedy / n,
    avgAiMargin: (sumAi - sumGreedy) / n,
  }
}
