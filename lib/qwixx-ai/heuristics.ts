import { MIN_MARKS_TO_LOCK, ROWS, pointsForMarks, rowMarkCount, type ColorKey } from "../qwixx"
import type { EvalResult, GameState, RowKey } from "./gameState"

export interface HeuristicWeights {
  lockProgress: number
  missExponent: number
  edgePenalty: number
  edgeRewardAfterFive: number
  blockOpponent: number
}

export const DEFAULT_WEIGHTS: HeuristicWeights = {
  lockProgress: 4.5,
  missExponent: 2.2,
  edgePenalty: 2.5,
  edgeRewardAfterFive: 1.5,
  blockOpponent: 3,
}

const COLORS: RowKey[] = ["red", "yellow", "green", "blue"]

function rowLen(color: RowKey): number {
  return ROWS.find((r) => r.key === color)!.numbers.length
}

function cumulativeRowScore(state: GameState): number {
  return COLORS.reduce((sum, c) => sum + pointsForMarks(rowMarkCount(state.self.rows[c] as never)), 0)
}

/** Bonus for being close to locking (5+ marks, near row end 2/12). */
function lockProgressBonus(state: GameState, w: HeuristicWeights): number {
  let bonus = 0
  for (const c of COLORS) {
    const row = state.self.rows[c]
    if (row.locked) {
      bonus += 6
      continue
    }
    const marks = row.marks.length
    if (marks < MIN_MARKS_TO_LOCK) continue
    const len = rowLen(c)
    const high = marks ? Math.max(...row.marks) : -1
    const distToLock = len - 1 - high
    bonus += w.lockProgress * (1 + (MIN_MARKS_TO_LOCK - Math.max(0, distToLock)) / MIN_MARKS_TO_LOCK)
  }
  return bonus
}

/** Grows quickly as misses approach 4 (−5 each at scoring time). */
function missPenalty(state: GameState, w: HeuristicWeights): number {
  const m = state.missCount
  if (m <= 0) return 0
  return w.missExponent ** m * 4
}

/**
 * Penalize marking near the open edge early; reward edge marks once 5+ exist
 * (flexibility to reach distant numbers later).
 */
function flexibilityTerm(state: GameState, w: HeuristicWeights): number {
  let term = 0
  for (const c of COLORS) {
    const row = state.self.rows[c]
    if (row.locked || row.marks.length === 0) continue
    const len = rowLen(c)
    const high = Math.max(...row.marks)
    const low = Math.min(...row.marks)
    const span = high - low
    if (row.marks.length < MIN_MARKS_TO_LOCK) {
      term -= w.edgePenalty * (len - 1 - high) * 0.15
      term -= w.edgePenalty * low * 0.08
    } else {
      term += w.edgeRewardAfterFive * span * 0.2
    }
  }
  return term
}

/** Increase value of rows where opponent is close to locking. */
function blockOpponentTerm(state: GameState, w: HeuristicWeights): number {
  let term = 0
  for (const c of COLORS) {
    const opp = state.opponentProgress[c]
    if (opp.locked) continue
    if (opp.markCount >= MIN_MARKS_TO_LOCK) {
      const len = rowLen(c)
      const dist = len - 1 - opp.highWater
      term += w.blockOpponent * (MIN_MARKS_TO_LOCK / Math.max(1, dist))
    }
  }
  return term
}

export function evaluateState(state: GameState, weights: HeuristicWeights = DEFAULT_WEIGHTS): EvalResult {
  const rowScore = cumulativeRowScore(state) - state.missCount * 5
  const lockBonus = lockProgressBonus(state, weights)
  const missPen = missPenalty(state, weights)
  const flexibility = flexibilityTerm(state, weights)
  const blockOpponent = blockOpponentTerm(state, weights)
  const score = rowScore + lockBonus - missPen + flexibility + blockOpponent
  return {
    score,
    breakdown: { rowScore, lockBonus, missPenalty: missPen, flexibility, blockOpponent },
  }
}

/** Perspective flip for simulating opponent ply. */
export function swapPerspective(state: GameState): GameState {
  return {
    ...state,
    self: state.opponent,
    opponent: state.self,
    opponentProgress: opponentProgressFrom(state.self),
    lockedRows: lockedFrom(state.opponent),
    missCount: state.opponent.penalties,
    selfIsActive: !state.selfIsActive,
    phase: flipPhase(state.phase),
    selfWhiteUsed: state.oppWhiteUsed,
    oppWhiteUsed: state.selfWhiteUsed,
    selfPlacedThisTurn: false,
  }
}

function opponentProgressFrom(sheet: GameState["self"]): GameState["opponentProgress"] {
  const out = {} as GameState["opponentProgress"]
  for (const c of COLORS) {
    const row = sheet.rows[c]
    out[c] = {
      markCount: row.marks.length + (row.locked ? 1 : 0),
      locked: row.locked,
      highWater: row.marks.length ? Math.max(...row.marks) : -1,
    }
  }
  return out
}

function lockedFrom(sheet: GameState["self"]): Set<RowKey> {
  return new Set(COLORS.filter((c) => sheet.rows[c].locked))
}

function flipPhase(phase: GameState["phase"]): GameState["phase"] {
  switch (phase) {
    case "whiteSelf":
      return "whiteOpp"
    case "whiteOpp":
      return "whiteSelf"
    case "colorSelf":
      return "colorOpp"
    case "colorOpp":
      return "colorSelf"
    default:
      return phase
  }
}

export type { ColorKey }
