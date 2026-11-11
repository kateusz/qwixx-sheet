import { MIN_MARKS_TO_LOCK } from "../qwixx"
import type { GameState, Move, RowKey } from "./gameState"
import type { HeuristicWeights } from "./heuristics"

const COLORS: RowKey[] = ["red", "yellow", "green", "blue"]
const ASCENDING: RowKey[] = ["red", "yellow"]
const FLEX_NUMBERS = new Set([6, 7, 8])
const ROW_LEN = 11

export function focusRows(state: GameState): RowKey[] {
  return COLORS.filter((c) => {
    const row = state.self.rows[c]
    const n = row.marks.length
    return !row.locked && n >= MIN_MARKS_TO_LOCK && n <= 6
  })
}

/** Rough P(no color hit). O(rows), not 6^6 — safe to call from the evaluator. */
export function bustRisk(sheet: { rows: Record<RowKey, { marks: number[]; locked: boolean }> }): number {
  let pMiss = 1
  let open = 0
  for (const c of COLORS) {
    const row = sheet.rows[c]
    if (row.locked) continue
    open++
    const high = row.marks.length ? Math.max(...row.marks) : -1
    let targets = 0
    for (let i = high + 1; i < ROW_LEN; i++) {
      if (i === ROW_LEN - 1 && row.marks.length < MIN_MARKS_TO_LOCK) continue
      targets++
    }
    const pHit = Math.min(0.92, targets * 0.11)
    pMiss *= 1 - pHit
  }
  return open === 0 ? 1 : pMiss
}

export function forcedMissProbability(state: GameState): number {
  if (!state.selfIsActive) return 0
  return bustRisk(state.self)
}

/** At 3 misses the next penalty ends the game. */
export function atDeathDoor(state: GameState): boolean {
  return state.missCount >= 3
}

/**
 * Move-local bonuses. Gap is how many cells this mark skips.
 * Red/yellow 6–8 only pay when the jump is at most one cell — an early 8
 * makes the row impossible to lock.
 */
export function shapeMark(
  self: GameState["self"],
  color: RowKey,
  index: number,
  number: number,
  w: HeuristicWeights,
): number {
  const row = self.rows[color]
  const high = row.marks.length ? Math.max(...row.marks) : -1
  const gap = index - high - 1
  let adj = 0

  if (row.marks.length > 0 && gap === 0) adj += w.continuationBonus
  if (row.marks.length === 0 && index <= 1) adj += w.startRowBonus
  if (ASCENDING.includes(color) && FLEX_NUMBERS.has(number) && gap <= 1) adj += w.middleNumberBonus
  if (index === ROW_LEN - 1 && row.marks.length >= MIN_MARKS_TO_LOCK) adj += w.lockNowBonus

  const focused = COLORS.filter((c) => {
    const r = self.rows[c]
    const n = r.marks.length
    return !r.locked && n >= MIN_MARKS_TO_LOCK && n <= 6
  })
  if (focused.length >= 2) {
    if (focused.includes(color)) adj += w.focusRowBonus
    else if (row.marks.length <= 1) adj -= w.marginalRowPenalty
  }
  return adj
}

export function scoreMoveHardRules(state: GameState, move: Move, w: HeuristicWeights): number {
  if (move.kind !== "mark" || move.color === undefined || move.index === undefined || move.number === undefined) {
    return 0
  }
  return shapeMark(state.self, move.color, move.index, move.number, w)
}

export function filterMovesAtThreeMisses(
  state: GameState,
  moves: Move[],
  evOf: (move: Move) => number,
): Move[] {
  if (!atDeathDoor(state)) return moves
  const marks = moves.filter((m) => m.kind === "mark")
  const positive = marks.filter((m) => evOf(m) > 0)
  if (positive.length > 0) return [...positive, { kind: "skip" }]
  if (state.selfIsActive && state.phase === "colorSelf" && marks.length > 0) return [...marks, { kind: "skip" }]
  return moves
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("hardRules.ts")) {
  const { buildGameState, emptySheet } = require("./gameState") as typeof import("./gameState")
  const s = buildGameState(emptySheet(), emptySheet(), { selfIsActive: true, phase: "roll" })
  const p = forcedMissProbability(s)
  console.assert(p >= 0 && p <= 1, "bust risk in [0,1]")
  console.assert(focusRows(s).length === 0, "empty board has no focus rows")
}
