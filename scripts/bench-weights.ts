/**
 * Compare two weight files head-to-head (or against the defaults).
 *   npx tsx scripts/bench-weights.ts a.json b.json [games]
 * Prints the margin of A over B, and both against the rule bots.
 */
import fs from "node:fs"
import { generationSeeds, marginBetween } from "../lib/qwixx-ai/evolve"
import { DEFAULT_WEIGHTS, type HeuristicWeights } from "../lib/qwixx-ai/heuristics"

const [fileA, fileB, gamesArg] = process.argv.slice(2)
const games = Number(gamesArg ?? 400)
if (!Number.isFinite(games) || games <= 0) throw new Error("games must be a positive number")

const load = (f: string | undefined): HeuristicWeights =>
  f ? { ...DEFAULT_WEIGHTS, ...(JSON.parse(fs.readFileSync(f, "utf8")) as Partial<HeuristicWeights>) } : DEFAULT_WEIGHTS

const a = load(fileA)
const b = load(fileB)
const seeds = generationSeeds(99, games, 4242)

console.log(
  JSON.stringify(
    {
      games,
      A: fileA ?? "defaults",
      B: fileB ?? "defaults",
      "A−B": +marginBetween(a, b, seeds).toFixed(2),
      "A vs taker": +marginBetween(a, "taker", seeds).toFixed(2),
      "B vs taker": +marginBetween(b, "taker", seeds).toFixed(2),
      "A vs greedy": +marginBetween(a, "greedy", seeds).toFixed(2),
      "B vs greedy": +marginBetween(b, "greedy", seeds).toFixed(2),
    },
    null,
    2,
  ),
)
