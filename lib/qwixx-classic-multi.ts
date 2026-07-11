import {
  ROWS,
  canMarkCell,
  createPlayer,
  isGameOver,
  totalScore,
  willLockRow,
  type ColorKey,
  type PlayerState,
} from "./qwixx"

export type ClassicPlayerId = "human" | "ai"
export type ClassicPhase = "roll" | "whiteHuman" | "whiteAi" | "colorHuman" | "colorAi" | "ended"

export interface ClassicRoll {
  values: number[]
  whiteSum: number
  ts: number
}

export interface ClassicMove {
  color: ColorKey
  index: number
  number: number
}

export interface ClassicGameState {
  human: PlayerState
  ai: PlayerState
  active: ClassicPlayerId
  phase: ClassicPhase
  roll: ClassicRoll | null
  /** Active player placed at least one mark this turn. */
  turnPlaced: boolean
  /** Color move already used this turn (active only, one color combo). */
  colorMoveUsed: boolean
  humanWhiteUsed: boolean
  aiWhiteUsed: boolean
  endReason?: "human" | "ai" | "both"
}

export function rowNumbers(color: ColorKey): number[] {
  return ROWS.find((r) => r.key === color)!.numbers
}

export function indexForNumber(color: ColorKey, num: number): number | null {
  const idx = rowNumbers(color).indexOf(num)
  return idx >= 0 ? idx : null
}

export function playerRef(state: ClassicGameState, id: ClassicPlayerId): PlayerState {
  return id === "human" ? state.human : state.ai
}

export function createClassicVsAi(humanName = "You", aiName = "AI"): ClassicGameState {
  return {
    human: createPlayer(humanName),
    ai: createPlayer(aiName),
    active: "human",
    phase: "roll",
    roll: null,
    turnPlaced: false,
    colorMoveUsed: false,
    humanWhiteUsed: false,
    aiWhiteUsed: false,
  }
}

function rowLength(color: ColorKey): number {
  return rowNumbers(color).length
}

function clonePlayer(p: PlayerState): PlayerState {
  const rows = {} as PlayerState["rows"]
  for (const key of Object.keys(p.rows) as ColorKey[]) {
    rows[key] = { marks: [...p.rows[key].marks], locked: p.rows[key].locked }
  }
  return { ...p, rows }
}

function setPlayer(state: ClassicGameState, id: ClassicPlayerId, player: PlayerState): ClassicGameState {
  return id === "human" ? { ...state, human: player } : { ...state, ai: player }
}

function checkEnd(state: ClassicGameState): ClassicGameState {
  const humanOver = isGameOver(state.human)
  const aiOver = isGameOver(state.ai)
  if (!humanOver && !aiOver) return state
  return {
    ...state,
    phase: "ended",
    endReason: humanOver && aiOver ? "both" : humanOver ? "human" : "ai",
  }
}

/** Legal white-sum marks for a player on the current roll. */
export function getWhiteSumMoves(state: ClassicGameState, player: ClassicPlayerId): ClassicMove[] {
  if (!state.roll) return []
  if (player === "human" && state.humanWhiteUsed) return []
  if (player === "ai" && state.aiWhiteUsed) return []
  const sum = state.roll.whiteSum
  const p = playerRef(state, player)
  const out: ClassicMove[] = []
  for (const config of ROWS) {
    const idx = indexForNumber(config.key, sum)
    if (idx === null) continue
    const len = rowLength(config.key)
    if (canMarkCell(p.rows[config.key], idx, len)) {
      out.push({ color: config.key, index: idx, number: sum })
    }
  }
  return out
}

/** Legal white+color marks for the active player (that color's row only). */
export function getColorMoves(state: ClassicGameState, player: ClassicPlayerId): ClassicMove[] {
  if (!state.roll || state.active !== player || state.colorMoveUsed) return []
  const [w1, w2] = state.roll.values
  const colorDice: [ColorKey, number][] = [
    ["red", state.roll.values[2]],
    ["yellow", state.roll.values[3]],
    ["green", state.roll.values[4]],
    ["blue", state.roll.values[5]],
  ]
  const p = playerRef(state, player)
  const out: ClassicMove[] = []
  for (const [color, dieVal] of colorDice) {
    for (const w of [w1, w2]) {
      const sum = w + dieVal
      const idx = indexForNumber(color, sum)
      if (idx === null) continue
      const len = rowLength(color)
      if (canMarkCell(p.rows[color], idx, len)) {
        const exists = out.some((m) => m.color === color && m.index === idx)
        if (!exists) out.push({ color, index: idx, number: sum })
      }
    }
  }
  return out
}

export function isValidMove(state: ClassicGameState, player: ClassicPlayerId, color: ColorKey, index: number): boolean {
  if (state.phase === "whiteHuman" && player === "human") {
    return getWhiteSumMoves(state, "human").some((m) => m.color === color && m.index === index)
  }
  if (state.phase === "colorHuman" && player === "human" && state.active === "human") {
    return getColorMoves(state, "human").some((m) => m.color === color && m.index === index)
  }
  return false
}

/** Remove a mark during the player's white or color phase (tap marked cell again). */
export function unmarkCell(
  state: ClassicGameState,
  player: ClassicPlayerId,
  color: ColorKey,
  index: number,
): ClassicGameState | null {
  const p = playerRef(state, player)
  const row = p.rows[color]
  if (!row.marks.includes(index)) return null

  const isWhitePhase =
    (state.phase === "whiteHuman" && player === "human") || (state.phase === "whiteAi" && player === "ai")
  const isColorPhase =
    (state.phase === "colorHuman" && player === "human" && state.active === "human") ||
    (state.phase === "colorAi" && player === "ai" && state.active === "ai")
  if (!isWhitePhase && !isColorPhase) return null

  const len = rowLength(color)
  const lockIdx = len - 1
  const newMarks = row.marks.filter((i) => i !== index)
  const nextPlayer = clonePlayer(p)
  nextPlayer.rows[color] = { marks: newMarks, locked: row.locked && newMarks.includes(lockIdx) }

  let next = setPlayer(state, player, nextPlayer)
  if (isWhitePhase && player === "human") next = { ...next, humanWhiteUsed: false }
  if (isWhitePhase && player === "ai") next = { ...next, aiWhiteUsed: false }
  if (isColorPhase) next = { ...next, colorMoveUsed: false }
  if (player === state.active) next = { ...next, turnPlaced: false }
  return next
}

export function applyMark(
  state: ClassicGameState,
  player: ClassicPlayerId,
  color: ColorKey,
  index: number,
): ClassicGameState | null {
  const len = rowLength(color)
  const p = playerRef(state, player)
  const row = p.rows[color]
  if (!canMarkCell(row, index, len)) return null

  const isWhitePhase =
    (state.phase === "whiteHuman" && player === "human") || (state.phase === "whiteAi" && player === "ai")
  const isColorPhase =
    (state.phase === "colorHuman" && player === "human" && state.active === "human") ||
    (state.phase === "colorAi" && player === "ai" && state.active === "ai")

  if (isWhitePhase) {
    if (!getWhiteSumMoves(state, player).some((m) => m.color === color && m.index === index)) return null
  } else if (isColorPhase) {
    if (!getColorMoves(state, player).some((m) => m.color === color && m.index === index)) return null
  } else {
    return null
  }

  const locks = willLockRow(row, index, len)
  const nextPlayer = clonePlayer(p)
  nextPlayer.rows[color] = {
    marks: [...row.marks, index],
    locked: locks || row.locked,
  }

  let next = setPlayer(state, player, nextPlayer)
  if (player === state.active) next = { ...next, turnPlaced: true }
  if (isColorPhase) next = { ...next, colorMoveUsed: true }
  if (isWhitePhase && player === "human") next = { ...next, humanWhiteUsed: true }
  if (isWhitePhase && player === "ai") next = { ...next, aiWhiteUsed: true }

  return checkEnd(next)
}

export function applyPenalty(state: ClassicGameState, player: ClassicPlayerId): ClassicGameState {
  const p = playerRef(state, player)
  const next = setPlayer(state, player, { ...p, penalties: p.penalties + 1 })
  return checkEnd(next)
}

export function rollDice(state: ClassicGameState, values: number[]): ClassicGameState {
  if (state.phase !== "roll") return state
  const roll: ClassicRoll = { values, whiteSum: values[0] + values[1], ts: Date.now() }
  return {
    ...state,
    roll,
    turnPlaced: false,
    colorMoveUsed: false,
    humanWhiteUsed: false,
    aiWhiteUsed: false,
    phase: "whiteHuman",
  }
}

export function skipWhiteHuman(state: ClassicGameState): ClassicGameState {
  if (state.phase !== "whiteHuman") return state
  return { ...state, phase: "whiteAi" }
}

export function afterWhiteAi(state: ClassicGameState): ClassicGameState {
  if (state.phase !== "whiteAi") return state
  return { ...state, phase: state.active === "human" ? "colorHuman" : "colorAi" }
}

export function finishTurn(state: ClassicGameState): ClassicGameState {
  let next = state
  if (!next.turnPlaced) {
    next = applyPenalty(next, next.active)
  }
  if (next.phase === "ended") return next

  const other: ClassicPlayerId = next.active === "human" ? "ai" : "human"
  return {
    ...next,
    active: other,
    phase: "roll",
    roll: null,
    turnPlaced: false,
    colorMoveUsed: false,
    humanWhiteUsed: false,
    aiWhiteUsed: false,
  }
}

export function endColorHuman(state: ClassicGameState): ClassicGameState {
  if (state.phase !== "colorHuman") return state
  return finishTurn(state)
}

export function afterColorAi(state: ClassicGameState): ClassicGameState {
  if (state.phase !== "colorAi") return state
  return finishTurn(state)
}

export function classicWinner(state: ClassicGameState): ClassicPlayerId | "tie" | null {
  if (state.phase !== "ended") return null
  const h = totalScore(state.human)
  const a = totalScore(state.ai)
  if (h > a) return "human"
  if (a > h) return "ai"
  return "tie"
}

export function randomRollValues(): number[] {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1)
}

// ponytail: minimal self-check
if (typeof process !== "undefined" && process.argv[1]?.endsWith("qwixx-classic-multi.ts")) {
  let s = createClassicVsAi()
  s = rollDice(s, [2, 3, 1, 4, 5, 6])
  console.assert(s.roll!.whiteSum === 5, "white sum")
  const moves = getWhiteSumMoves(s, "human")
  console.assert(moves.some((m) => m.color === "yellow" && m.number === 5), "white 5 on yellow")

  s = applyMark(s, "human", "yellow", moves.find((m) => m.color === "yellow")!.index)!
  console.assert(s.turnPlaced && s.human.rows.yellow.marks.length === 1, "human marked on active turn")

  s = { ...s, phase: "colorHuman", turnPlaced: true }
  const colorMoves = getColorMoves(s, "human")
  console.assert(colorMoves.length > 0, "color moves exist")
}
