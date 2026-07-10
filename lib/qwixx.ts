export type ColorKey = "red" | "yellow" | "green" | "blue"

export interface RowConfig {
  key: ColorKey
  label: string
  /** Numbers in the order they must be marked (left to right on screen). */
  numbers: number[]
  /** Solid band background. */
  band: string
  /** Lighter cell background sitting on the band. */
  cell: string
  /** Number / X text color inside a cell. */
  ink: string
  /** Darker shade used for the flag pointer. */
  flag: string
}

/**
 * Board layout & theming. Red and yellow read 2 -> 12 (left to right),
 * green and blue read 12 -> 2. These four colors are intrinsic to Qwixx.
 */
export const ROWS: RowConfig[] = [
  {
    key: "red",
    label: "Red",
    numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    band: "bg-red-500",
    cell: "bg-red-200",
    ink: "text-red-700",
    flag: "text-red-700",
  },
  {
    key: "yellow",
    label: "Yellow",
    numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    band: "bg-yellow-400",
    cell: "bg-yellow-100",
    ink: "text-yellow-700",
    flag: "text-yellow-600",
  },
  {
    key: "green",
    label: "Green",
    numbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    band: "bg-green-600",
    cell: "bg-green-200",
    ink: "text-green-800",
    flag: "text-green-800",
  },
  {
    key: "blue",
    label: "Blue",
    numbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    band: "bg-blue-600",
    cell: "bg-blue-200",
    ink: "text-blue-800",
    flag: "text-blue-900",
  },
]

/** Points progression: 1,3,6,10,15,21,28,36,45,55,66,78 (triangular numbers). */
export function pointsForMarks(count: number): number {
  return (count * (count + 1)) / 2
}

/** The full conversion table for the rules reference. */
export const CONVERSION_TABLE: { marks: number; points: number }[] = Array.from({ length: 12 }, (_, i) => ({
  marks: i + 1,
  points: pointsForMarks(i + 1),
}))

export const PENALTY_VALUE = 5
export const MAX_PENALTIES = 4
export const MIN_MARKS_TO_LOCK = 5
export const LOCKS_TO_END = 2

export interface RowState {
  /** Marked cell indices (into RowConfig.numbers). */
  marks: number[]
  locked: boolean
}

export interface PlayerState {
  id: string
  name: string
  rows: Record<ColorKey, RowState>
  penalties: number
}

export function emptyRow(): RowState {
  return { marks: [], locked: false }
}

export function createPlayer(name = "Player"): PlayerState {
  return {
    id: Math.random().toString(36).slice(2, 9),
    name,
    rows: {
      red: emptyRow(),
      yellow: emptyRow(),
      green: emptyRow(),
      blue: emptyRow(),
    },
    penalties: 0,
  }
}

/** Number of crosses in a row (a lock counts as one extra cross). */
export function rowMarkCount(row: RowState): number {
  return row.marks.length + (row.locked ? 1 : 0)
}

export function rowScore(row: RowState): number {
  return pointsForMarks(rowMarkCount(row))
}

export function totalScore(player: PlayerState): number {
  const rowsTotal = (Object.keys(player.rows) as ColorKey[]).reduce((sum, key) => sum + rowScore(player.rows[key]), 0)
  return rowsTotal - player.penalties * PENALTY_VALUE
}

export function totalMarks(player: PlayerState): number {
  return (Object.keys(player.rows) as ColorKey[]).reduce((sum, key) => sum + rowMarkCount(player.rows[key]), 0)
}

export type CellStatus = "marked" | "available" | "skipped" | "locked-out"

/** Highest marked index, or -1 if none. */
function maxMarkedIndex(row: RowState): number {
  return row.marks.length ? Math.max(...row.marks) : -1
}

/**
 * Official rule: numbers must be crossed from left to right, a number can only
 * be crossed if it is to the right of every previous cross, and the final
 * (right-most) number requires at least five crosses in the row beforehand.
 */
export function canMarkCell(row: RowState, index: number, rowLength: number): boolean {
  if (row.locked) return false
  if (row.marks.includes(index)) return false
  if (index <= maxMarkedIndex(row)) return false
  const isLast = index === rowLength - 1
  if (isLast && row.marks.length < MIN_MARKS_TO_LOCK) return false
  return true
}

export function cellStatus(row: RowState, index: number, rowLength: number): CellStatus {
  if (row.marks.includes(index)) return "marked"
  if (row.locked) return "locked-out"
  if (canMarkCell(row, index, rowLength)) return "available"
  return index <= maxMarkedIndex(row) ? "skipped" : "locked-out"
}

/** Crossing the right-most number closes the row (only allowed after 5 marks). */
export function willLockRow(row: RowState, index: number, rowLength: number): boolean {
  return index === rowLength - 1 && canMarkCell(row, index, rowLength)
}

export function lockedRowCount(player: PlayerState): number {
  return (Object.keys(player.rows) as ColorKey[]).filter((k) => player.rows[k].locked).length
}

/** Solo session ends at 4 penalties or 2 locked rows (official end conditions). */
export function isGameOver(player: PlayerState): boolean {
  return lockedRowCount(player) >= LOCKS_TO_END || player.penalties >= MAX_PENALTIES
}
