import { isGameOver, type ColorKey } from "../qwixx"

export type RowKey = ColorKey

export interface RowProgress {
  marks: number[]
  locked: boolean
}

/** Lightweight opponent snapshot for heuristic blocking terms. */
export interface OpponentRowProgress {
  markCount: number
  locked: boolean
  /** Highest marked index, or -1. */
  highWater: number
}

export interface PlayerSheet {
  rows: Record<RowKey, RowProgress>
  penalties: number
}

export interface DiceRoll {
  values: number[]
  whiteSum: number
}

export type TurnPhase = "roll" | "whiteSelf" | "whiteOpp" | "colorSelf" | "colorOpp" | "ended"

/**
 * AI-facing snapshot: self sheet + opponent awareness + turn context.
 * `selfIsActive` is true when self is the rolling/active player this round.
 */
export interface GameState {
  self: PlayerSheet
  opponent: PlayerSheet
  /** Simplified per-row opponent progress for heuristics. */
  opponentProgress: Record<RowKey, OpponentRowProgress>
  lockedRows: Set<RowKey>
  missCount: number
  selfIsActive: boolean
  phase: TurnPhase
  roll: DiceRoll | null
  selfWhiteUsed: boolean
  oppWhiteUsed: boolean
  colorMoveUsed: boolean
  selfPlacedThisTurn: boolean
}

export interface Move {
  kind: "mark" | "skip" | "penalty"
  color?: RowKey
  index?: number
  number?: number
}

export interface EvalResult {
  score: number
  breakdown: {
    rowScore: number
    lockBonus: number
    missPenalty: number
    flexibility: number
    blockOpponent: number
    hardRules: number
  }
}

const COLORS: RowKey[] = ["red", "yellow", "green", "blue"]

export function emptySheet(): PlayerSheet {
  return {
    rows: {
      red: { marks: [], locked: false },
      yellow: { marks: [], locked: false },
      green: { marks: [], locked: false },
      blue: { marks: [], locked: false },
    },
    penalties: 0,
  }
}

export function cloneSheet(s: PlayerSheet): PlayerSheet {
  const rows = {} as PlayerSheet["rows"]
  for (const c of COLORS) rows[c] = { marks: [...s.rows[c].marks], locked: s.rows[c].locked }
  return { ...s, rows }
}

export function cloneGameState(s: GameState): GameState {
  return {
    ...s,
    self: cloneSheet(s.self),
    opponent: cloneSheet(s.opponent),
    opponentProgress: { ...s.opponentProgress },
    lockedRows: new Set(s.lockedRows),
    roll: s.roll ? { values: [...s.roll.values], whiteSum: s.roll.whiteSum } : null,
  }
}

export function lockedRowsFromSheet(sheet: PlayerSheet): Set<RowKey> {
  return new Set(COLORS.filter((c) => sheet.rows[c].locked))
}

export function opponentProgressFromSheet(sheet: PlayerSheet): Record<RowKey, OpponentRowProgress> {
  const out = {} as Record<RowKey, OpponentRowProgress>
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

export function buildGameState(
  self: PlayerSheet,
  opponent: PlayerSheet,
  opts: {
    selfIsActive: boolean
    phase: TurnPhase
    roll?: DiceRoll | null
    selfWhiteUsed?: boolean
    oppWhiteUsed?: boolean
    colorMoveUsed?: boolean
    selfPlacedThisTurn?: boolean
  },
): GameState {
  return {
    self,
    opponent,
    opponentProgress: opponentProgressFromSheet(opponent),
    lockedRows: lockedRowsFromSheet(self),
    missCount: self.penalties,
    selfIsActive: opts.selfIsActive,
    phase: opts.phase,
    roll: opts.roll ?? null,
    selfWhiteUsed: opts.selfWhiteUsed ?? false,
    oppWhiteUsed: opts.oppWhiteUsed ?? false,
    colorMoveUsed: opts.colorMoveUsed ?? false,
    selfPlacedThisTurn: opts.selfPlacedThisTurn ?? false,
  }
}

export function isTerminal(state: GameState): boolean {
  return state.phase === "ended" || isGameOver(state.self as never) || isGameOver(state.opponent as never)
}
