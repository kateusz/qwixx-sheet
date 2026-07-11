import { MAX_PENALTIES, MIN_MARKS_TO_LOCK, ROWS } from "../qwixx"
import { buildSixDiceOutcomes, diceRollFromValues } from "./diceProbabilities"
import type { DiceRoll, GameState, Move, RowKey } from "./gameState"
import { generateLegalMoves } from "./moveGenerator"
import type { HeuristicWeights } from "./heuristics"

const COLORS: RowKey[] = ["red", "yellow", "green", "blue"]
const ASCENDING: RowKey[] = ["red", "yellow"]
const FLEX_NUMBERS = new Set([6, 7, 8])

function rowLen(color: RowKey): number {
  return ROWS.find((r) => r.key === color)!.numbers.length
}

/** Rows with 5–6 marks where we should finish before branching out. */
export function focusRows(state: GameState): RowKey[] {
  return COLORS.filter((c) => {
    const row = state.self.rows[c]
    const n = row.marks.length
    return !row.locked && n >= MIN_MARKS_TO_LOCK && n <= 6
  })
}

export function isLockMove(state: GameState, move: Move): boolean {
  if (move.kind !== "mark" || move.color === undefined || move.index === undefined) return false
  const len = rowLen(move.color)
  return move.index === len - 1 && state.self.rows[move.color].marks.length >= MIN_MARKS_TO_LOCK
}

/** Per-move corrective bonuses/penalties from the hard-rule table. */
export function scoreMoveHardRules(state: GameState, move: Move, w: HeuristicWeights): number {
  if (move.kind !== "mark" || move.color === undefined || move.number === undefined) return 0

  let adj = 0
  const rowMarks = state.self.rows[move.color].marks.length
  const focused = focusRows(state)

  // Finish two developing rows; ignore marginal marks elsewhere.
  if (focused.length >= 2) {
    if (focused.includes(move.color)) adj += w.focusRowBonus
    else if (rowMarks <= 1) adj -= w.marginalRowPenalty
  }

  // Red/yellow 6–8: highest flexibility — strongly prefer when legal.
  if (ASCENDING.includes(move.color) && FLEX_NUMBERS.has(move.number)) {
    adj += w.middleNumberBonus
  }

  // 5+ marks and lock cell open: seize the free cross and remove the die.
  if (isLockMove(state, move)) adj += w.lockNowBonus

  return adj
}

/** Opponent about to lock a row we already invested in — row die disappears soon. */
export function investedRowUrgency(state: GameState, w: HeuristicWeights): number {
  let term = 0
  for (const c of COLORS) {
    const selfMarks = state.self.rows[c].marks.length
    if (selfMarks === 0 || state.self.rows[c].locked) continue
    const opp = state.opponentProgress[c]
    if (opp.locked || opp.markCount < MIN_MARKS_TO_LOCK) continue
    const dist = rowLen(c) - 1 - opp.highWater
    term += w.investedRowUrgency * (1 + selfMarks * 0.3) * (MIN_MARKS_TO_LOCK / Math.max(1, dist))
  }
  return term
}

/** At 3 misses the next penalty ends the game — only positive-EV marks are acceptable. */
export function atDeathDoor(state: GameState): boolean {
  return state.missCount >= MAX_PENALTIES - 1
}

/**
 * P(active player finds no color mark on a random roll) — used in planning.
 * ponytail: full 6^6 scan once, cached.
 */
let forcedMissCache: Map<string, number> | null = null

function cacheKey(state: GameState): string {
  const rows = COLORS.map((c) => {
    const r = state.self.rows[c]
    return `${c}:${r.marks.join(".")}:${r.locked ? 1 : 0}`
  }).join("|")
  return `${rows}|active:${state.selfIsActive ? 1 : 0}`
}

export function forcedMissProbability(state: GameState): number {
  if (!state.selfIsActive) return 0
  if (!forcedMissCache) forcedMissCache = new Map()
  const key = cacheKey(state)
  const hit = forcedMissCache.get(key)
  if (hit !== undefined) return hit

  let p = 0
  for (const outcome of buildSixDiceOutcomes()) {
    const roll = diceRollFromValues(outcome.values)
    if (!hasActiveColorMark(state, roll)) p += outcome.probability
  }
  forcedMissCache.set(key, p)
  return p
}

function hasActiveColorMark(state: GameState, roll: DiceRoll): boolean {
  const sim = {
    ...state,
    roll,
    selfWhiteUsed: true,
    colorMoveUsed: false,
    phase: "colorSelf" as const,
  }
  const moves = generateLegalMoves(sim, roll, true).filter((m) => m.kind === "mark")
  return moves.length > 0
}

/** Subtract anticipated forced-miss cost during look-ahead. */
export function forcedMissPlanningPenalty(state: GameState, w: HeuristicWeights): number {
  if (!state.selfIsActive || state.phase === "ended") return 0
  const p = forcedMissProbability(state)
  const cost = 5 * (atDeathDoor(state) ? w.deathDoorMissMultiplier : 1)
  return p * cost * w.forcedMissWeight
}

/** Filter to strictly positive-EV marks when one miss from elimination. */
export function filterMovesAtThreeMisses(
  state: GameState,
  moves: Move[],
  evOf: (move: Move) => number,
): Move[] {
  if (!atDeathDoor(state)) return moves
  const marks = moves.filter((m) => m.kind === "mark")
  const positive = marks.filter((m) => evOf(m) > 0)
  if (positive.length > 0) return [...positive, { kind: "skip" }]
  // Active turn: skip means game-ending 4th penalty — keep marks even if EV ≤ 0.
  if (state.selfIsActive && state.phase === "colorSelf" && marks.length > 0) return [...marks, { kind: "skip" }]
  return moves
}

// ponytail: minimal self-check
if (typeof process !== "undefined" && process.argv[1]?.endsWith("hardRules.ts")) {
  const { buildGameState, emptySheet } = require("./gameState") as typeof import("./gameState")
  const s = buildGameState(emptySheet(), emptySheet(), { selfIsActive: true, phase: "roll" })
  console.assert(focusRows(s).length === 0, "empty board has no focus rows")
  console.assert(forcedMissProbability(s) >= 0 && forcedMissProbability(s) <= 1, "forced miss in [0,1]")
}
