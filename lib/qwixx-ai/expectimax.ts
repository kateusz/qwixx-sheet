import { buildSixDiceOutcomes, diceRollFromValues } from "./diceProbabilities"
import { filterMovesAtThreeMisses, scoreMoveHardRules } from "./hardRules"
import { cloneGameState, isTerminal, type GameState, type Move } from "./gameState"
import { evaluateState, swapPerspective, DEFAULT_WEIGHTS, type HeuristicWeights } from "./heuristics"
import {
  advanceAfterSelfMove,
  advancePhase,
  generateLegalMoves,
  generatePhaseMoves,
  startRound,
} from "./moveGenerator"

export interface ExpectimaxResult {
  value: number
  move: Move | null
}

export interface ExpectimaxOptions {
  weights?: HeuristicWeights
  /** Sampled future rolls at chance nodes; full 46656 enumeration is the default ceiling. */
  chanceSampleSize?: number
}

/**
 * Expectimax with MAX (self) / CHANCE (dice) / MIN (opponent via perspective swap).
 * Depth counts full plies (one decision + optional chance roll).
 */
export function expectimax(
  state: GameState,
  depth: number,
  isActivePlayer: boolean,
  opts: ExpectimaxOptions = {},
): ExpectimaxResult {
  if (isTerminal(state) || depth <= 0) {
    return { value: evaluateState(state, opts.weights).score, move: null }
  }

  if (state.phase === "roll") {
    return chanceNode(state, depth, opts)
  }

  const rawMoves = currentDecisionMoves(state, isActivePlayer)
  const parentScore = evaluateState(state, opts.weights).score
  const moves = filterMovesAtThreeMisses(state, rawMoves, (move) => {
    const child = resolveDecision(state, move, isActivePlayer)
    const delta = evaluateState(child, opts.weights).score - parentScore
    return move.kind === "mark" ? delta + scoreMoveHardRules(state, move, opts.weights ?? DEFAULT_WEIGHTS) : delta
  })

  if (moves.length === 0) {
    return { value: evaluateState(state, opts.weights).score, move: null }
  }

  let best: ExpectimaxResult = { value: -Infinity, move: moves[0]! }

  for (const move of moves) {
    const child = resolveDecision(state, move, isActivePlayer)
    const isSelfDecision = isSelfTurn(state)
    const childScore = evaluateState(child, opts.weights).score
    let value: number

    if (child.phase === "roll" && depth > 1) {
      value = chanceNode(child, depth - 1, opts).value
    } else if (isSelfDecision) {
      value = expectimax(child, depth - 1, isActivePlayer, opts).value
    } else {
      // Opponent minimizes our equity.
      value = expectimax(swapPerspective(child), depth - 1, !isActivePlayer, opts).value
    }

    if (isSelfDecision && move.kind === "mark") {
      value += scoreMoveHardRules(state, move, opts.weights ?? DEFAULT_WEIGHTS)
    }

    if (value > best.value) {
      best = { value, move }
    }
  }

  return best
}

function isSelfTurn(state: GameState): boolean {
  return state.phase === "whiteSelf" || state.phase === "colorSelf"
}

function currentDecisionMoves(state: GameState, isActivePlayer: boolean): Move[] {
  if (!state.roll) return [{ kind: "skip" }]
  if (state.phase === "whiteSelf") {
    return generateLegalMoves(state, state.roll, isActivePlayer)
  }
  if (state.phase === "colorSelf" && state.selfIsActive) {
    return generateLegalMoves({ ...state, selfWhiteUsed: true }, state.roll, true)
  }
  return generatePhaseMoves(state)
}

function resolveDecision(state: GameState, move: Move, isActivePlayer: boolean): GameState {
  let next = advanceAfterSelfMove(state, move)
  next = advancePhase(next)

  if (next.phase === "whiteOpp" && next.roll) {
    // Greedy opponent white response (single ply inside simulation).
    const oppView = swapPerspective(next)
    const oppMoves = generateLegalMoves(oppView, next.roll, !isActivePlayer).filter((m) => m.kind === "mark")
    const oppPick = oppMoves[0] ?? { kind: "skip" as const }
    let oppApplied = advanceAfterSelfMove(oppView, oppPick)
    oppApplied = { ...oppApplied, phase: "whiteOpp", oppWhiteUsed: true }
    next = swapPerspective(oppApplied)
    next = advancePhase(next)
  }

  return next
}

function chanceNode(state: GameState, depth: number, opts: ExpectimaxOptions): ExpectimaxResult {
  const outcomes = sampleOutcomes(opts.chanceSampleSize)
  let expected = 0

  for (const outcome of outcomes) {
    const roll = diceRollFromValues(outcome.values)
    const child = startRound(state, roll)
    const { value } = expectimax(child, depth - 1, child.selfIsActive, opts)
    expected += value * outcome.probability
  }

  return { value: expected, move: null }
}

function sampleOutcomes(sampleSize?: number): ReadonlyArray<{ values: readonly number[]; probability: number }> {
  const all = buildSixDiceOutcomes()
  if (!sampleSize || sampleSize >= all.length) return all

  // ponytail: uniform stride sample preserves total probability mass via renormalization
  const step = Math.max(1, Math.floor(all.length / sampleSize))
  const picked = all.filter((_, i) => i % step === 0).slice(0, sampleSize)
  const mass = picked.reduce((s, o) => s + o.probability, 0)
  return picked.map((o) => ({ values: o.values, probability: o.probability / mass }))
}

/** Pick the best immediate move for the current roll using expectimax. */
export function pickBestMove(
  state: GameState,
  depth: number,
  isActivePlayer: boolean,
  opts?: ExpectimaxOptions,
): Move | null {
  if (!state.roll) return null
  const rawMoves =
    state.phase === "colorSelf" && state.selfIsActive
      ? generateLegalMoves({ ...state, selfWhiteUsed: true }, state.roll, true)
      : generateLegalMoves(state, state.roll, isActivePlayer)

  const parentScore = evaluateState(state, opts?.weights).score
  const moves = filterMovesAtThreeMisses(state, rawMoves, (move) => {
    const child = resolveDecision(cloneGameState(state), move, isActivePlayer)
    const delta = evaluateState(child, opts?.weights).score - parentScore
    return move.kind === "mark" ? delta + scoreMoveHardRules(state, move, opts?.weights ?? DEFAULT_WEIGHTS) : delta
  })

  let best: ExpectimaxResult = { value: -Infinity, move: null }
  for (const move of moves) {
    const child = resolveDecision(cloneGameState(state), move, isActivePlayer)
    let value =
      child.phase === "roll" && depth > 1
        ? chanceNode(child, depth - 1, opts ?? {}).value
        : evaluateState(child, opts?.weights).score
    if (move.kind === "mark") {
      value += scoreMoveHardRules(state, move, opts?.weights ?? DEFAULT_WEIGHTS)
    }
    if (value > best.value) {
      best = { value, move }
    }
  }

  return best.move?.kind === "mark" ? best.move : null
}

// ponytail: minimal self-check
if (typeof process !== "undefined" && process.argv[1]?.endsWith("expectimax.ts")) {
  const { buildGameState, emptySheet } = require("./gameState") as typeof import("./gameState")
  const s = buildGameState(emptySheet(), emptySheet(), {
    selfIsActive: true,
    phase: "whiteSelf",
    roll: { values: [2, 3, 1, 4, 5, 6], whiteSum: 5 },
  })
  const r = expectimax(s, 1, true, { chanceSampleSize: 50 })
  console.assert(Number.isFinite(r.value), "expectimax returns finite value")
}
