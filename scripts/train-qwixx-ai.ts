/**
 * Train Qwixx heuristic weights on one CPU core.
 *
 *   pnpm train:ai -- --hours 168 --games 32
 *
 * On a VPS, prefer the service (no hanging SSH):
 *   sudo ./scripts/qwixx-trainctl.sh install
 *   sudo ./scripts/qwixx-trainctl.sh start
 *   sudo ./scripts/qwixx-trainctl.sh stop
 * Panel: the URL printed by install (port 8787).
 *
 * --hours 0 runs until the process is stopped. Checkpoint: training/checkpoint.json.
 * Live stats: training/status.json. Improved weights: lib/qwixx-ai/tuned-weights.json.
 */
import fs from "node:fs"
import path from "node:path"

import { generationSeeds, marginBetween, mutateWeights, makeRng, playGame } from "../lib/qwixx-ai/evolve"
import { activeWeights, DEFAULT_WEIGHTS, type HeuristicWeights } from "../lib/qwixx-ai/heuristics"

interface Checkpoint {
  generation: number
  sigma: number
  stall: number
  champion: HeuristicWeights
  vsTaker: number
  games: number
  updatedAt: string
}

function argPath(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0 || !process.argv[i + 1]) return fallback
  return path.resolve(process.argv[i + 1]!)
}

const root = path.resolve(import.meta.dirname, "..")
const checkpointPath = argPath("checkpoint", path.join(root, "training", "checkpoint.json"))
const weightsPath = argPath("weights", path.join(root, "lib", "qwixx-ai", "tuned-weights.json"))
const statusPath = argPath("status", path.join(root, "training", "status.json"))

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0 || process.argv[i + 1] === undefined) return fallback
  const n = Number(process.argv[i + 1])
  return Number.isFinite(n) ? n : fallback
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

function loadSeedWeights(): HeuristicWeights {
  try {
    const raw = JSON.parse(fs.readFileSync(weightsPath, "utf8")) as Partial<HeuristicWeights>
    return { ...DEFAULT_WEIGHTS, ...raw }
  } catch {
    return { ...DEFAULT_WEIGHTS }
  }
}

function loadCheckpoint(): Checkpoint | null {
  try {
    const raw = JSON.parse(fs.readFileSync(checkpointPath, "utf8")) as Checkpoint
    if (!raw?.champion) return null
    const legacy = raw as Checkpoint & { vsGreedy?: number }
    return {
      ...raw,
      vsTaker: raw.vsTaker ?? legacy.vsGreedy ?? Number.NEGATIVE_INFINITY,
      champion: { ...DEFAULT_WEIGHTS, ...raw.champion },
    }
  } catch {
    return null
  }
}

function bench() {
  const games = arg("games", 40)
  const seeds = generationSeeds(1, games, 7)
  const policy = activeWeights()
  const t = Date.now()
  let my = 0
  let opp = 0
  for (let i = 0; i < seeds.length; i++) {
    const swap = i % 2 === 1
    const res = swap
      ? playGame("taker", policy, makeRng(seeds[i]!))
      : playGame(policy, "taker", makeRng(seeds[i]!))
    my += swap ? res.ai : res.human
    opp += swap ? res.human : res.ai
  }
  console.log(
    JSON.stringify({
      games,
      margin: Number(((my - opp) / games).toFixed(2)),
      avgAi: Number((my / games).toFixed(2)),
      avgTaker: Number((opp / games).toFixed(2)),
      ms: Date.now() - t,
    }),
  )
}

function main() {
  if (process.argv.includes("--bench")) {
    bench()
    return
  }

  const hours = arg("hours", 168)
  const games = arg("games", 24)
  const lambda = arg("lambda", 6)
  const maxGen = arg("generations", 1_000_000)
  const salt = arg("seed", 1)
  const startedMs = Date.now()
  const deadline = hours <= 0 ? Number.POSITIVE_INFINITY : startedMs + hours * 3600 * 1000

  let cp: Checkpoint = loadCheckpoint() ?? {
    generation: 0,
    sigma: 0.25,
    stall: 0,
    champion: loadSeedWeights(),
    vsTaker: Number.NEGATIVE_INFINITY,
    games,
    updatedAt: new Date().toISOString(),
  }

  const startedAt = new Date(startedMs).toISOString()
  let history: { gen: number; vsTaker: number | null; sigma: number; event: string; at: string }[] = []
  let bestVs = Number.NEGATIVE_INFINITY
  let kept = 0
  try {
    const prev = JSON.parse(fs.readFileSync(statusPath, "utf8")) as {
      history?: typeof history
      bestVsTaker?: number
      kept?: number
    }
    if (Array.isArray(prev.history)) history = prev.history.slice(-240)
    if (typeof prev.bestVsTaker === "number") bestVs = prev.bestVsTaker
    if (typeof prev.kept === "number") kept = prev.kept
  } catch {
    /* first run */
  }
  if (Number.isFinite(cp.vsTaker) && cp.vsTaker > bestVs) bestVs = cp.vsTaker
  const startGen = cp.generation

  const publish = (state: "running" | "evaluating" | "stopped" | "done") => {
    const elapsed = Date.now() - startedMs
    writeJson(statusPath, {
      state,
      pid: process.pid,
      startedAt,
      updatedAt: new Date().toISOString(),
      generation: cp.generation,
      sigma: round(cp.sigma),
      stall: cp.stall,
      vsTaker: round(cp.vsTaker),
      bestVsTaker: round(bestVs),
      games,
      lambda,
      kept,
      gensPerHour: elapsed > 0 ? round(((cp.generation - startGen) / elapsed) * 3_600_000) : 0,
      hoursLimit: hours <= 0 ? null : hours,
      champion: cp.champion,
      history,
    })
  }

  console.log(
    `train start gen=${cp.generation} sigma=${cp.sigma.toFixed(3)} games=${games} lambda=${lambda} hours=${hours <= 0 ? "unlimited" : hours}`,
  )
  publish("running")

  const save = () => {
    cp.updatedAt = new Date().toISOString()
    cp.games = games
    writeJson(checkpointPath, cp)
  }

  const shutdown = (state: "stopped" | "done") => {
    save()
    publish(state)
  }

  process.on("SIGINT", () => {
    shutdown("stopped")
    console.log("\nsaved", checkpointPath)
    process.exit(0)
  })
  process.on("SIGTERM", () => {
    shutdown("stopped")
    process.exit(0)
  })

  while (cp.generation < maxGen && Date.now() < deadline) {
    const gen = cp.generation + 1
    publish("evaluating")
    const seeds = generationSeeds(gen, games, salt)
    const rng = makeRng((gen * 17 + salt) >>> 0)
    const champMargin = marginBetween(cp.champion, "taker", seeds)

    let best = cp.champion
    let bestMargin = champMargin
    for (let k = 0; k < lambda; k++) {
      const child = mutateWeights(cp.champion, cp.sigma, rng)
      const margin = marginBetween(child, "taker", seeds)
      if (margin > bestMargin) {
        best = child
        bestMargin = margin
      }
    }

    let improved = best !== cp.champion && bestMargin > champMargin + 1
    if (improved) {
      const confirm = generationSeeds(gen, games, salt + 7919)
      const holdChild = marginBetween(best, "taker", confirm)
      const holdChamp = marginBetween(cp.champion, "taker", confirm)
      improved = holdChild > holdChamp + 0.75
      if (improved) bestMargin = (bestMargin + holdChild) / 2
    }
    cp.generation = gen
    cp.vsTaker = improved ? bestMargin : champMargin
    if (improved) {
      cp.champion = best
      cp.stall = 0
      cp.sigma = Math.max(0.08, cp.sigma * 0.98)
      writeJson(weightsPath, cp.champion)
    } else {
      cp.stall += 1
      cp.sigma = Math.max(0.08, cp.sigma * 0.995)
      if (cp.stall >= 20) {
        cp.sigma = 0.45
        cp.stall = 0
      }
    }
    save()
    const event = improved ? "keep" : "stay"
    if (improved) kept += 1
    if (Number.isFinite(cp.vsTaker) && cp.vsTaker > bestVs) bestVs = cp.vsTaker
    history.push({
      gen,
      vsTaker: round(cp.vsTaker),
      sigma: round(cp.sigma),
      event,
      at: new Date().toISOString(),
    })
    if (history.length > 240) history = history.slice(-240)
    publish("running")

    if (improved || gen % 25 === 0) {
      const elapsedH = (Date.now() - startedMs) / 3_600_000
      console.log(
        `gen ${gen}  vsTaker ${cp.vsTaker.toFixed(2)}  sigma ${cp.sigma.toFixed(3)}  ${improved ? "KEEP" : "stay"}  ${elapsedH.toFixed(2)}h`,
      )
    }
  }

  shutdown("done")
  console.log("done", { generation: cp.generation, vsTaker: cp.vsTaker, weights: weightsPath })
}

function round(n: number): number | null {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

main()
