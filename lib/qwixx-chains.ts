import {
  MIN_MARKS_TO_LOCK,
  ROWS,
  canMarkCell,
  type ColorKey,
  type PlayerState,
  type RowState,
  willLockRow,
} from "./qwixx"

export interface ChainCell {
  color: ColorKey
  index: number
}

export interface ChainPair {
  a: ChainCell
  b: ChainCell
}

/** Chain boxes from the official Qwixx Chains sheet (Version B). */
export const CHAIN_PAIRS: ChainPair[] = [
  { a: { color: "red", index: 1 }, b: { color: "yellow", index: 1 } }, // 3 ↔ 3
  { a: { color: "red", index: 6 }, b: { color: "yellow", index: 6 } }, // 8 ↔ 8
  { a: { color: "yellow", index: 4 }, b: { color: "green", index: 4 } }, // 6 ↔ 8
  { a: { color: "yellow", index: 9 }, b: { color: "green", index: 8 } }, // 11 ↔ 3
  { a: { color: "green", index: 2 }, b: { color: "blue", index: 2 } }, // 10 ↔ 10
  { a: { color: "green", index: 6 }, b: { color: "blue", index: 6 } }, // 5 ↔ 5
]

const partnerKey = (color: ColorKey, index: number) => `${color}:${index}`

const PARTNER_MAP = new Map<string, ChainCell>()
for (const { a, b } of CHAIN_PAIRS) {
  PARTNER_MAP.set(partnerKey(a.color, a.index), b)
  PARTNER_MAP.set(partnerKey(b.color, b.index), a)
}

export function getChainPartner(color: ColorKey, index: number): ChainCell | null {
  return PARTNER_MAP.get(partnerKey(color, index)) ?? null
}

export function isChainCell(color: ColorKey, index: number): boolean {
  return PARTNER_MAP.has(partnerKey(color, index))
}

export function chainIndicesForRow(color: ColorKey): number[] {
  return CHAIN_PAIRS.flatMap(({ a, b }) => {
    if (a.color === color) return [a.index]
    if (b.color === color) return [b.index]
    return []
  })
}

function rowLength(color: ColorKey): number {
  return ROWS.find((r) => r.key === color)!.numbers.length
}

/** Force-mark a cell — ignores left-to-right and locked-row restrictions (chain rule). */
function forceMarkRow(row: RowState, index: number, rowLen: number): RowState {
  if (row.marks.includes(index)) return row
  const marks = [...row.marks, index]
  const lockIdx = rowLen - 1
  const locked = row.locked || (index === lockIdx && marks.length >= MIN_MARKS_TO_LOCK)
  return { marks, locked }
}

function unmarkRow(row: RowState, index: number, rowLen: number): RowState {
  const marks = row.marks.filter((i) => i !== index)
  const lockIdx = rowLen - 1
  return { marks, locked: row.locked && marks.includes(lockIdx) }
}

/** Apply a mark or unmark, including mandatory chain partner marks. */
export function applyCellToggle(player: PlayerState, color: ColorKey, index: number): PlayerState {
  const rowLen = rowLength(color)
  const row = player.rows[color]

  if (row.marks.includes(index)) {
    let next = { ...player, rows: { ...player.rows, [color]: unmarkRow(row, index, rowLen) } }
    const partner = getChainPartner(color, index)
    if (partner && next.rows[partner.color].marks.includes(partner.index)) {
      const pLen = rowLength(partner.color)
      next = {
        ...next,
        rows: {
          ...next.rows,
          [partner.color]: unmarkRow(next.rows[partner.color], partner.index, pLen),
        },
      }
    }
    return next
  }

  if (row.locked || !canMarkCell(row, index, rowLen)) return player

  let nextRow = forceMarkRow(row, index, rowLen)
  if (willLockRow(row, index, rowLen)) {
    nextRow = { ...nextRow, locked: true }
  }

  let next: PlayerState = { ...player, rows: { ...player.rows, [color]: nextRow } }

  const partner = getChainPartner(color, index)
  if (partner) {
    const pRow = next.rows[partner.color]
    const pLen = rowLength(partner.color)
    if (!pRow.marks.includes(partner.index)) {
      next = {
        ...next,
        rows: { ...next.rows, [partner.color]: forceMarkRow(pRow, partner.index, pLen) },
      }
    }
  }

  return next
}
