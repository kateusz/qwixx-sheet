import { isGameOver, ROWS, canMarkCell } from "../qwixx"
import { indexForNumber, rowNumbers } from "../qwixx-classic-multi"
import { cloneGameState, type DiceRoll, type GameState, type Move, type RowKey } from "./gameState"

const COLORS: RowKey[] = ["red", "yellow", "green", "blue"]

function rowLength(color: RowKey): number {
  return rowNumbers(color).length
}

function whiteSumMovesForSheet(
  sheet: GameState["self"],
  roll: DiceRoll,
  whiteUsed: boolean,
): Move[] {
  if (whiteUsed) return []
  const sum = roll.whiteSum
  const out: Move[] = []
  for (const config of ROWS) {
    const idx = indexForNumber(config.key, sum)
    if (idx === null) continue
    const len = rowLength(config.key)
    if (canMarkCell(sheet.rows[config.key], idx, len)) {
      out.push({ kind: "mark", color: config.key, index: idx, number: sum })
    }
  }
  return out
}

function colorMovesForSheet(sheet: GameState["self"], roll: DiceRoll): Move[] {
  const [w1, w2] = roll.values
  const colorDice: [RowKey, number][] = [
    ["red", roll.values[2]!],
    ["yellow", roll.values[3]!],
    ["green", roll.values[4]!],
    ["blue", roll.values[5]!],
  ]
  const out: Move[] = []
  for (const [color, dieVal] of colorDice) {
    for (const w of [w1, w2]) {
      const sum = w! + dieVal
      const idx = indexForNumber(color, sum)
      if (idx === null) continue
      const len = rowLength(color)
      if (canMarkCell(sheet.rows[color], idx, len)) {
        if (!out.some((m) => m.color === color && m.index === idx)) {
          out.push({ kind: "mark", color, index: idx, number: sum })
        }
      }
    }
  }
  return out
}

/**
 * Legal moves for the current decision context.
 * `isActivePlayer` mirrors official rules: passive players only get white-sum marks;
 * active players get white-sum (if unused) and one color combo.
 * Always includes an explicit skip when no mark is mandatory.
 */
export function generateLegalMoves(state: GameState, diceRoll: DiceRoll, isActivePlayer: boolean): Move[] {
  const sheet = state.self
  const moves: Move[] = []

  if (!state.selfWhiteUsed) {
    moves.push(...whiteSumMovesForSheet(sheet, diceRoll, false))
  }

  if (isActivePlayer && !state.colorMoveUsed) {
    moves.push(...colorMovesForSheet(sheet, diceRoll))
  }

  const unique = dedupeMarks(moves)
  unique.push({ kind: "skip" })
  return unique
}

function dedupeMarks(moves: Move[]): Move[] {
  const seen = new Set<string>()
  return moves.filter((m) => {
    if (m.kind !== "mark") return true
    const key = `${m.color}:${m.index}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Moves available in the current phase of a simulated GameState. */
export function generatePhaseMoves(state: GameState): Move[] {
  if (!state.roll || state.phase === "ended" || state.phase === "roll") return [{ kind: "skip" }]

  if (state.phase === "whiteSelf") {
    return generateLegalMoves(state, state.roll, state.selfIsActive)
  }
  if (state.phase === "whiteOpp") {
    // Opponent white phase is modeled by swapping perspectives in simulation.
    return [{ kind: "skip" }]
  }
  if (state.phase === "colorSelf" && state.selfIsActive) {
    return generateLegalMoves(
      { ...state, selfWhiteUsed: true },
      state.roll,
      true,
    )
  }
  return [{ kind: "skip" }]
}

export function applyMoveToSheet(
  sheet: GameState["self"],
  move: Move,
): GameState["self"] | null {
  if (move.kind !== "mark" || move.color === undefined || move.index === undefined) return sheet
  const color = move.color
  const index = move.index
  const len = rowLength(color)
  const row = sheet.rows[color]
  if (!canMarkCell(row, index, len)) return null
  const locks = index === len - 1
  const next = { ...sheet, rows: { ...sheet.rows } }
  next.rows[color] = { marks: [...row.marks, index], locked: locks || row.locked }
  return next
}

export function applyPenaltyToSheet(sheet: GameState["self"]): GameState["self"] {
  return { ...sheet, penalties: sheet.penalties + 1 }
}

/** Advance turn state after a self move or skip within the current round. */
export function advanceAfterSelfMove(state: GameState, move: Move): GameState {
  const next = cloneStateLite(state)
  if (move.kind === "mark") {
    const updated = applyMoveToSheet(next.self, move)
    if (!updated) return state
    next.self = updated
    next.selfPlacedThisTurn = true
    next.missCount = next.self.penalties
    next.lockedRows = new Set(COLORS.filter((c) => next.self.rows[c].locked))
    if (next.phase === "whiteSelf") next.selfWhiteUsed = true
    if (next.phase === "colorSelf") next.colorMoveUsed = true
    return syncOpponentProgress(next)
  }

  if (next.phase === "whiteSelf") next.selfWhiteUsed = true
  if (next.phase === "colorSelf") next.colorMoveUsed = true
  return next
}

function cloneStateLite(state: GameState): GameState {
  return {
    ...state,
    self: {
      ...state.self,
      rows: Object.fromEntries(
        COLORS.map((c) => [c, { marks: [...state.self.rows[c].marks], locked: state.self.rows[c].locked }]),
      ) as GameState["self"]["rows"],
    },
    opponent: {
      ...state.opponent,
      rows: Object.fromEntries(
        COLORS.map((c) => [c, { marks: [...state.opponent.rows[c].marks], locked: state.opponent.rows[c].locked }]),
      ) as GameState["opponent"]["rows"],
    },
    lockedRows: new Set(state.lockedRows),
    roll: state.roll ? { ...state.roll, values: [...state.roll.values] } : null,
  }
}

function syncOpponentProgress(state: GameState): GameState {
  const opponentProgress = {} as GameState["opponentProgress"]
  for (const c of COLORS) {
    const row = state.opponent.rows[c]
    opponentProgress[c] = {
      markCount: row.marks.length + (row.locked ? 1 : 0),
      locked: row.locked,
      highWater: row.marks.length ? Math.max(...row.marks) : -1,
    }
  }
  return { ...state, opponentProgress }
}

export function advancePhase(state: GameState): GameState {
  let next = cloneGameState(state)
  switch (next.phase) {
    case "whiteSelf":
      next.phase = next.oppWhiteUsed ? (next.selfIsActive ? "colorSelf" : "colorOpp") : "whiteOpp"
      break
    case "whiteOpp":
      next.phase = next.selfIsActive ? "colorSelf" : "colorOpp"
      break
    case "colorSelf":
      next = finishTurn(next)
      break
    case "colorOpp":
      next = finishTurn(next)
      break
    default:
      break
  }
  return next
}

function finishTurn(state: GameState): GameState {
  let next = cloneGameState(state)
  if (next.selfIsActive && !next.selfPlacedThisTurn) {
    next.self = applyPenaltyToSheet(next.self)
    next.missCount = next.self.penalties
  }
  if (isGameOver(next.self as never) || isGameOver(next.opponent as never)) {
    next.phase = "ended"
    return next
  }
  next.selfIsActive = !next.selfIsActive
  next.phase = "roll"
  next.roll = null
  next.selfWhiteUsed = false
  next.oppWhiteUsed = false
  next.colorMoveUsed = false
  next.selfPlacedThisTurn = false
  return next
}

export function startRound(state: GameState, roll: DiceRoll): GameState {
  const next = cloneGameState(state)
  next.roll = roll
  next.selfWhiteUsed = false
  next.oppWhiteUsed = false
  next.colorMoveUsed = false
  next.selfPlacedThisTurn = false
  next.phase = "whiteSelf"
  return next
}
