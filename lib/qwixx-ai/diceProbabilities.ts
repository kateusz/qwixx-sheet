/** Probability of each sum when rolling two fair d6 (2–12). */
export type TwoDiceSumDistribution = ReadonlyMap<number, number>

/** One fully enumerated six-dice roll and its probability. */
export interface SixDiceOutcome {
  values: readonly [number, number, number, number, number, number]
  probability: number
}

let twoDiceSumCache: TwoDiceSumDistribution | null = null
let sixDiceCache: SixDiceOutcome[] | null = null

/** Build P(sum) for two independent fair d6. */
export function buildTwoDiceSumDistribution(): TwoDiceSumDistribution {
  if (twoDiceSumCache) return twoDiceSumCache
  const counts = new Map<number, number>()
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const sum = a + b
      counts.set(sum, (counts.get(sum) ?? 0) + 1)
    }
  }
  const total = 36
  const dist = new Map<number, number>()
  for (const [sum, count] of counts) dist.set(sum, count / total)
  twoDiceSumCache = dist
  return dist
}

/** Enumerate all 6^6 equally likely dice rolls (cached). */
export function buildSixDiceOutcomes(): readonly SixDiceOutcome[] {
  if (sixDiceCache) return sixDiceCache
  const p = 1 / 46656
  const out: SixDiceOutcome[] = []
  for (let d0 = 1; d0 <= 6; d0++) {
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        for (let d3 = 1; d3 <= 6; d3++) {
          for (let d4 = 1; d4 <= 6; d4++) {
            for (let d5 = 1; d5 <= 6; d5++) {
              out.push({ values: [d0, d1, d2, d3, d4, d5], probability: p })
            }
          }
        }
      }
    }
  }
  sixDiceCache = out
  return out
}

export function diceRollFromValues(values: readonly number[]): { values: number[]; whiteSum: number } {
  const v = [...values]
  return { values: v, whiteSum: v[0]! + v[1]! }
}
