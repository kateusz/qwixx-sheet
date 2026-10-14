import { MAX_PENALTIES, MIN_MARKS_TO_LOCK, PENALTY_VALUE, pointsForMarks, type ColorKey } from "../qwixx"
import { bustRisk, scoreMoveHardRules } from "./hardRules"
import type { EvalResult, GameState, Move, RowKey } from "./gameState"
import tuned from "./tuned-weights.json"

export interface HeuristicWeights {
  lockProgress: number
  /** Extra quadratic penalty on miss count (the −5 is already in the score). */
  missExponent: number
  /** Cost of each skipped cell, applied as weight × holes². */
  edgePenalty: number
  edgeRewardAfterFive: number
  blockOpponent: number
  focusRowBonus: number
  marginalRowPenalty: number
  middleNumberBonus: number
  lockNowBonus: number
  investedRowUrgency: number
  forcedMissWeight: number
  deathDoorMissMultiplier: number
  oppWeight: number
  /** White skip beats a mark unless the mark scores higher than this. */
  passWhite: number
  passColor: number
  continuationBonus: number
  startRowBonus: number
  strandedPenalty: number
  almostLock: number
  /** Second lock while behind ends the game — don't do it. */
  endWhileBehind: number
}

export const DEFAULT_WEIGHTS: HeuristicWeights = {
  lockProgress: 4,
  missExponent: 2.2,
  edgePenalty: 0.9,
  edgeRewardAfterFive: 1.4,
  blockOpponent: 2,
  focusRowBonus: 3,
  marginalRowPenalty: 5,
  middleNumberBonus: 2.2,
  lockNowBonus: 4,
  investedRowUrgency: 2,
  forcedMissWeight: 1.5,
  deathDoorMissMultiplier: 3,
  oppWeight: 1,
  passWhite: 0.6,
  passColor: 0.4,
  continuationBonus: 2.2,
  startRowBonus: 1.5,
  strandedPenalty: 14,
  almostLock: 3.5,
  endWhileBehind: 16,
}

const COLORS: RowKey[] = ["red", "yellow", "green", "blue"]
const ROW_LEN = 11

export function activeWeights(): HeuristicWeights {
  return { ...DEFAULT_WEIGHTS, ...(tuned as Partial<HeuristicWeights>) }
}

export interface SheetLike {
  rows: Record<RowKey, { marks: number[]; locked: boolean }>
  penalties: number
}

function sheetPoints(sheet: SheetLike): number {
  let n = 0
  for (const c of COLORS) {
    const row = sheet.rows[c]
    n += pointsForMarks(row.marks.length + (row.locked ? 1 : 0))
  }
  return n - sheet.penalties * PENALTY_VALUE
}

function locksOf(sheet: SheetLike): number {
  let n = 0
  for (const c of COLORS) if (sheet.rows[c].locked) n++
  return n
}

function isTerminal(me: SheetLike, opp: SheetLike): boolean {
  return me.penalties >= MAX_PENALTIES || opp.penalties >= MAX_PENALTIES || locksOf(me) >= 2 || locksOf(opp) >= 2
}

/** Higher is better for `me`. Terminal positions use the real score only. */
export function evaluatePlayers(me: SheetLike, opp: SheetLike, w: HeuristicWeights = DEFAULT_WEIGHTS): number {
  const myPts = sheetPoints(me)
  const oppPts = sheetPoints(opp)
  let score = myPts - w.oppWeight * oppPts

  if (isTerminal(me, opp)) {
    if (me.penalties >= MAX_PENALTIES) score -= 40
    if (opp.penalties >= MAX_PENALTIES) score += 40
    if (locksOf(me) >= 2 && myPts + 8 < oppPts) score -= w.endWhileBehind
    return score
  }

  if (me.penalties > 0) score -= w.missExponent * me.penalties * me.penalties

  for (const c of COLORS) {
    const row = me.rows[c]
    const count = row.marks.length
    const high = count ? Math.max(...row.marks) : -1
    if (row.locked) {
      score += w.lockProgress
      continue
    }
    if (count > 0) {
      // Cells to the left of the rightmost cross can never be marked.
      const holes = high + 1 - count
      score -= w.edgePenalty * holes * holes
      const remaining = Math.max(0, ROW_LEN - 2 - high)
      if (count + remaining < MIN_MARKS_TO_LOCK) score -= w.strandedPenalty
      if (count === 4) score += w.almostLock
      if (count >= MIN_MARKS_TO_LOCK) {
        score += w.edgeRewardAfterFive * (count - 4)
        score += w.lockProgress / (1 + Math.max(0, ROW_LEN - 2 - high))
      }
    }

    const oppRow = opp.rows[c]
    if (!oppRow.locked && oppRow.marks.length >= MIN_MARKS_TO_LOCK && count > 0) {
      const oppHigh = Math.max(...oppRow.marks)
      const dist = Math.max(1, ROW_LEN - 2 - oppHigh)
      const pressure = MIN_MARKS_TO_LOCK / dist
      score += w.investedRowUrgency * (1 + count * 0.25) * pressure
      score += w.blockOpponent * pressure
    }
  }

  const bust = bustRisk(me) * (me.penalties >= 3 ? w.deathDoorMissMultiplier : 1)
  score -= w.forcedMissWeight * bust
  return score
}

export function evaluateState(state: GameState, weights: HeuristicWeights = DEFAULT_WEIGHTS): EvalResult {
  const score = evaluatePlayers(state.self, state.opponent, weights)
  return {
    score,
    breakdown: {
      rowScore: score,
      lockBonus: 0,
      missPenalty: 0,
      flexibility: 0,
      blockOpponent: 0,
      hardRules: 0,
    },
  }
}

export function evaluateMove(
  state: GameState,
  move: Move,
  childScore: number,
  parentScore: number,
  weights: HeuristicWeights = DEFAULT_WEIGHTS,
): number {
  const delta = childScore - parentScore
  return move.kind === "mark" ? delta + scoreMoveHardRules(state, move, weights) : delta
}

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
