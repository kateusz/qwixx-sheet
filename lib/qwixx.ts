export type ColorKey = "red" | "yellow" | "green" | "blue"

export interface RowConfig {
  key: ColorKey
  label: string
  /** Numbers in the order they must be marked (left to right on screen). */
  numbers: number[]
  /** Direction the physical sheet reads. */
  direction: "ltr" | "rtl"
  /** Tailwind classes for theming this color. */
  solid: string
  soft: string
  ring: string
  text: string
}

export const ROWS: RowConfig[] = [
  {
    key: "red",
    label: "Red",
    numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    direction: "ltr",
    solid: "bg-red-500",
    soft: "bg-red-500/10",
    ring: "ring-red-500",
    text: "text-red-600 dark:text-red-400",
  },
  {
    key: "yellow",
    label: "Yellow",
    numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    direction: "ltr",
    solid: "bg-yellow-400",
    soft: "bg-yellow-400/15",
    ring: "ring-yellow-400",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  {
    key: "green",
    label: "Green",
    numbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    direction: "rtl",
    solid: "bg-green-500",
    soft: "bg-green-500/10",
    ring: "ring-green-500",
    text: "text-green-600 dark:text-green-400",
  },
  {
    key: "blue",
    label: "Blue",
    numbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    direction: "rtl",
    solid: "bg-blue-500",
    soft: "bg-blue-500/10",
    ring: "ring-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
]

/** Points progression: 1,3,6,10,15,21,28,36,45,55,66,78 (triangular numbers). */
export function pointsForMarks(count: number): number {
  return (count * (count + 1)) / 2
}

/** The full conversion table for reference display. */
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

export function createPlayer(name: string): PlayerState {
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
  const rowsTotal = (Object.keys(player.rows) as ColorKey[]).reduce(
    (sum, key) => sum + rowScore(player.rows[key]),
    0,
  )
  return rowsTotal - player.penalties * PENALTY_VALUE
}

export type CellStatus = "marked" | "available" | "skipped" | "closed"

/** Highest marked index, or -1 if none. */
function maxMarkedIndex(row: RowState): number {
  return row.marks.length ? Math.max(...row.marks) : -1
}

export function cellStatus(row: RowState, index: number): CellStatus {
  if (row.marks.includes(index)) return "marked"
  if (row.locked) return "closed"
  if (index > maxMarkedIndex(row)) return "available"
  return "skipped"
}

export function canLockRow(row: RowState): boolean {
  return !row.locked && rowMarkCount(row) >= MIN_MARKS_TO_LOCK
}

export function lockedRowCount(player: PlayerState): number {
  return (Object.keys(player.rows) as ColorKey[]).filter((k) => player.rows[k].locked).length
}

export function isGameOver(players: PlayerState[]): boolean {
  return players.some((p) => lockedRowCount(p) >= LOCKS_TO_END || p.penalties >= MAX_PENALTIES)
}

export function getWinners(players: PlayerState[]): PlayerState[] {
  const best = Math.max(...players.map(totalScore))
  return players.filter((p) => totalScore(p) === best)
}
