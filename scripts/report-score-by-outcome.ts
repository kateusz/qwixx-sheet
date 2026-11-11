/**
 * Average sheet score in wins vs losses, for one or more generation seed sets.
 *
 *   pnpm exec tsx scripts/report-score-by-outcome.ts
 *   pnpm exec tsx scripts/report-score-by-outcome.ts --games 32 --from 1 --to 20
 *   pnpm exec tsx scripts/report-score-by-outcome.ts --weights path.json --seed 1
 */
import fs from "node:fs"
import path from "node:path"
import { generationSeeds, matchupStats } from "../lib/qwixx-ai/evolve"
import { DEFAULT_WEIGHTS, activeWeights, type HeuristicWeights } from "../lib/qwixx-ai/heuristics"

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0 || process.argv[i + 1] === undefined) return fallback
  const n = Number(process.argv[i + 1])
  return Number.isFinite(n) ? n : fallback
}

function argStr(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : null
}

const games = arg("games", 32)
const from = arg("from", 1)
const to = arg("to", from)
const salt = arg("seed", 1)
const weightsPath = argStr("weights")
const weights: HeuristicWeights = weightsPath
  ? { ...DEFAULT_WEIGHTS, ...(JSON.parse(fs.readFileSync(path.resolve(weightsPath), "utf8")) as Partial<HeuristicWeights>) }
  : activeWeights()

const rows = []
for (let gen = from; gen <= to; gen++) {
  const s = matchupStats(weights, "taker", generationSeeds(gen, games, salt))
  rows.push({
    gen,
    wins: s.wins,
    losses: s.losses,
    ties: s.ties,
    avgScoreWins: s.avgScoreWins == null ? null : +s.avgScoreWins.toFixed(2),
    avgScoreLosses: s.avgScoreLosses == null ? null : +s.avgScoreLosses.toFixed(2),
    margin: +s.margin.toFixed(2),
    avgMyScore: +s.avgMyScore.toFixed(2),
  })
}

console.log(JSON.stringify({ games, salt, from, to, weights: weightsPath ?? "active", rows }, null, 2))
