import {
  LOCKS_TO_END,
  MAX_PENALTIES,
  MIN_MARKS_TO_LOCK,
  PENALTY_VALUE,
  ROWS,
  pointsForMarks,
  type ColorKey,
} from "./qwixx"

export type DuelPlayerId = "p1" | "p2"
export type DuelPhase = "roll" | "action1" | "action2" | "ended"
export type PlacementKind = "new" | "stack" | "beat"

export const DUEL_STARTING_TOKENS = 22
export const MAX_SCORING_TOKENS_PER_ROW = 12

export interface DuelTokenCell {
  owner: DuelPlayerId
  stack: number
}

export interface DuelRowState {
  tokens: Partial<Record<number, DuelTokenCell>>
  locked: boolean
  lockOwner?: DuelPlayerId
}

export interface DuelPlayer {
  name: string
  tokensLeft: number
  penalties: number
}

export interface DuelRoll {
  values: number[]
  whiteSum: number
  ts: number
}

export interface DuelPlacement {
  color: ColorKey
  index: number
  kind: PlacementKind
}

export interface DuelState {
  p1: DuelPlayer
  p2: DuelPlayer
  rows: Record<ColorKey, DuelRowState>
  active: DuelPlayerId
  phase: DuelPhase
  roll: DuelRoll | null
  action1: DuelPlacement | null
  disabledDice: ColorKey[]
  totalMisthrows: number
  /** Order of misthrow tokens for display. */
  misthrowOwners: DuelPlayerId[]
  endReason?: string
}

export function emptyDuelRow(): DuelRowState {
  return { tokens: {}, locked: false }
}

export function createDuelState(p1Name = "Player 1", p2Name = "Player 2"): DuelState {
  return {
    p1: { name: p1Name, tokensLeft: DUEL_STARTING_TOKENS, penalties: 0 },
    p2: { name: p2Name, tokensLeft: DUEL_STARTING_TOKENS, penalties: 0 },
    rows: { red: emptyDuelRow(), yellow: emptyDuelRow(), green: emptyDuelRow(), blue: emptyDuelRow() },
    active: "p1",
    phase: "roll",
    roll: null,
    action1: null,
    disabledDice: [],
    totalMisthrows: 0,
    misthrowOwners: [],
  }
}

export function duelPlayer(state: DuelState, id: DuelPlayerId): DuelPlayer {
  return id === "p1" ? state.p1 : state.p2
}

export function rowNumbers(color: ColorKey): number[] {
  return ROWS.find((r) => r.key === color)!.numbers
}

export function indexForNumber(color: ColorKey, num: number): number | null {
  const idx = rowNumbers(color).indexOf(num)
  return idx >= 0 ? idx : null
}

export function lastNumberIndex(color: ColorKey): number {
  return rowNumbers(color).length - 1
}

export function getForemost(row: DuelRowState): { index: number; cell: DuelTokenCell } | null {
  let maxIdx = -1
  let cell: DuelTokenCell | undefined
  for (const [idx, c] of Object.entries(row.tokens)) {
    const i = Number(idx)
    if (c && i > maxIdx) {
      maxIdx = i
      cell = c
    }
  }
  return cell ? { index: maxIdx, cell } : null
}

export function playerMaxIndex(row: DuelRowState, player: DuelPlayerId): number {
  let max = -1
  for (const [idx, cell] of Object.entries(row.tokens)) {
    if (cell?.owner === player) max = Math.max(max, Number(idx))
  }
  return max
}

export function countPlayerTokensInRow(row: DuelRowState, player: DuelPlayerId): number {
  let n = 0
  for (const cell of Object.values(row.tokens)) {
    if (cell?.owner === player) n += cell.stack
  }
  if (row.lockOwner === player) n += 1
  return n
}

export function lockedRowCount(state: DuelState): number {
  return (Object.keys(state.rows) as ColorKey[]).filter((k) => state.rows[k].locked).length
}

function cloneRows(rows: DuelState["rows"]): DuelState["rows"] {
  const next = {} as DuelState["rows"]
  for (const key of Object.keys(rows) as ColorKey[]) {
    next[key] = { ...rows[key], tokens: { ...rows[key].tokens } }
  }
  return next
}

/** Valid placements for a number in optional single-color filter (action 2). */
export function getValidPlacements(
  state: DuelState,
  player: DuelPlayerId,
  number: number,
  colorFilter?: ColorKey,
  exclude?: DuelPlacement | null,
): DuelPlacement[] {
  const out: DuelPlacement[] = []
  for (const config of ROWS) {
    if (colorFilter && config.key !== colorFilter) continue
    if (state.rows[config.key].locked || state.disabledDice.includes(config.key)) continue
    const idx = indexForNumber(config.key, number)
    if (idx === null) continue
    if (exclude && exclude.color === config.key && exclude.index === idx) continue
    const kind = placementKindAt(state, player, config.key, idx, number)
    if (kind) out.push({ color: config.key, index: idx, kind })
  }
  return out
}

/** Resolve placement kind for a known color row. */
export function placementKindAt(
  state: DuelState,
  player: DuelPlayerId,
  color: ColorKey,
  index: number,
  number: number,
): PlacementKind | null {
  const row = state.rows[color]
  if (row.locked || state.disabledDice.includes(color)) return null
  if (rowNumbers(color)[index] !== number) return null

  const existing = row.tokens[index]
  const foremost = getForemost(row)
  const pMax = playerMaxIndex(row, player)
  const isLast = index === lastNumberIndex(color)

  if (existing) {
    if (existing.owner === player && foremost?.index === index) return "stack"
    if (existing.owner !== player && foremost?.index === index && existing.stack === 1) return "beat"
    return null
  }

  if (pMax >= index) return null
  if (isLast && countPlayerTokensInRow(row, player) < MIN_MARKS_TO_LOCK) return null
  return "new"
}

export interface Action2Option {
  color: ColorKey
  whiteIndex: 0 | 1
  sum: number
  placements: DuelPlacement[]
}

export function getAction2Options(state: DuelState, player: DuelPlayerId): Action2Option[] {
  if (!state.roll) return []
  const [w1, w2] = state.roll.values
  const colorDice: [ColorKey, number][] = [
    ["red", state.roll.values[2]],
    ["yellow", state.roll.values[3]],
    ["green", state.roll.values[4]],
    ["blue", state.roll.values[5]],
  ]
  const options: Action2Option[] = []
  for (const [color, dieVal] of colorDice) {
    if (state.disabledDice.includes(color)) continue
    for (const [wi, w] of [
      [0, w1],
      [1, w2],
    ] as const) {
      const sum = w + dieVal
      const placements = getValidPlacements(state, player, sum, color, state.action1)
      if (placements.length > 0) {
        options.push({ color, whiteIndex: wi, sum, placements })
      }
    }
  }
  return options
}

function applyLockIfNeeded(state: DuelState, player: DuelPlayerId, color: ColorKey, index: number): DuelState {
  if (index !== lastNumberIndex(color)) return state
  const row = state.rows[color]
  if (row.locked) return state

  const playerRef = duelPlayer(state, player)
  if (playerRef.tokensLeft <= 0) {
    return { ...state, phase: "ended", endReason: "last_token" }
  }

  const rows = cloneRows(state.rows)
  rows[color] = { ...rows[color], locked: true, lockOwner: player }
  const disabledDice = state.disabledDice.includes(color) ? state.disabledDice : [...state.disabledDice, color]

  const key = player
  const updatedPlayer = { ...playerRef, tokensLeft: playerRef.tokensLeft - 1 }
  let next: DuelState = { ...state, rows, disabledDice, [key]: updatedPlayer }

  if (checkEndAfterMove(next)) {
    next = { ...next, phase: "ended", endReason: endReason(next) }
  }
  return next
}

function checkEndAfterMove(state: DuelState): boolean {
  return (
    state.p1.tokensLeft === 0 ||
    state.p2.tokensLeft === 0 ||
    state.totalMisthrows >= MAX_PENALTIES ||
    lockedRowCount(state) >= LOCKS_TO_END
  )
}

function endReason(state: DuelState): string {
  if (state.p1.tokensLeft === 0 || state.p2.tokensLeft === 0) return "last_token"
  if (state.totalMisthrows >= MAX_PENALTIES) return "penalties"
  if (lockedRowCount(state) >= LOCKS_TO_END) return "locks"
  return "ended"
}

export function applyPlacement(
  state: DuelState,
  player: DuelPlayerId,
  color: ColorKey,
  index: number,
  number: number,
): DuelState | null {
  const kind = placementKindAt(state, player, color, index, number)
  if (!kind) return null

  const playerRef = duelPlayer(state, player)
  if (playerRef.tokensLeft <= 0) return null

  let next: DuelState = { ...state, rows: cloneRows(state.rows) }
  const row = next.rows[color]
  const cell = row.tokens[index]

  if (kind === "beat" && cell) {
    const beatenOwner = cell.owner
    row.tokens[index] = { owner: player, stack: 1 }
    const beatenKey = beatenOwner
    const beaten = duelPlayer(next, beatenOwner)
    next = { ...next, [beatenKey]: { ...beaten, tokensLeft: beaten.tokensLeft + 1 } }
  } else if (kind === "stack" && cell) {
    row.tokens[index] = { owner: player, stack: cell.stack + 1 }
  } else {
    row.tokens[index] = { owner: player, stack: 1 }
  }

  const actorKey = player
  const actor = duelPlayer(next, player)
  next = { ...next, [actorKey]: { ...actor, tokensLeft: actor.tokensLeft - 1 } }

  if (index === lastNumberIndex(color)) {
    next = applyLockIfNeeded(next, player, color, index)
    if (next.phase === "ended") return next
  }

  if (checkEndAfterMove(next)) {
    return { ...next, phase: "ended", endReason: endReason(next) }
  }

  return next
}

export function applyMisthrow(state: DuelState): DuelState {
  const player = state.active
  const ref = duelPlayer(state, player)
  const next: DuelState = {
    ...state,
    [player]: { ...ref, penalties: ref.penalties + 1 },
    totalMisthrows: state.totalMisthrows + 1,
    misthrowOwners: [...state.misthrowOwners, player],
  }
  if (next.totalMisthrows >= MAX_PENALTIES) {
    return { ...next, phase: "ended", endReason: "penalties" }
  }
  return next
}

export function finishTurn(state: DuelState, placedThisTurn: boolean): DuelState {
  let next = state
  if (!placedThisTurn) next = applyMisthrow(next)
  if (next.phase === "ended") return next
  return {
    ...next,
    active: next.active === "p1" ? "p2" : "p1",
    phase: "roll",
    roll: null,
    action1: null,
  }
}

export function rowTokenScore(row: DuelRowState, player: DuelPlayerId): number {
  const count = Math.min(countPlayerTokensInRow(row, player), MAX_SCORING_TOKENS_PER_ROW)
  return pointsForMarks(count)
}

export function duelTotalScore(state: DuelState, player: DuelPlayerId): number {
  const rowsTotal = (Object.keys(state.rows) as ColorKey[]).reduce(
    (sum, key) => sum + rowTokenScore(state.rows[key], player),
    0,
  )
  return rowsTotal - duelPlayer(state, player).penalties * PENALTY_VALUE
}

export function duelWinner(state: DuelState): DuelPlayerId | "tie" | null {
  if (state.phase !== "ended") return null
  const s1 = duelTotalScore(state, "p1")
  const s2 = duelTotalScore(state, "p2")
  if (s1 > s2) return "p1"
  if (s2 > s1) return "p2"
  return "tie"
}

// ponytail: minimal self-check — run via `node --experimental-strip-types` if needed
if (typeof process !== "undefined" && process.argv[1]?.endsWith("qwixx-duel.ts")) {
  let s = createDuelState()
  s = { ...s, phase: "action1", roll: { values: [2, 3, 1, 1, 1, 1], whiteSum: 5, ts: 0 } }
  const p = getValidPlacements(s, "p1", 5)
  console.assert(p.some((x) => x.color === "yellow" && x.index === 3), "white 5 -> yellow 5")
}
