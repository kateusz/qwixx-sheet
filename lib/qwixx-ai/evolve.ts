import { totalScore } from "../qwixx"
import {
  afterColorAi,
  afterWhiteAi,
  applyMark,
  createClassicVsAi,
  endColorHuman,
  finishTurn,
  getColorMoves,
  getWhiteSumMoves,
  playerRef,
  rollDice,
  skipWhiteHuman,
  type ClassicGameState,
  type ClassicMove,
  type ClassicPlayerId,
} from "../qwixx-classic-multi"
import { fastPick, makeRng } from "./fastPolicy"
import { DEFAULT_WEIGHTS, type HeuristicWeights } from "./heuristics"

export type SeatPolicy = HeuristicWeights | "greedy" | "taker"

export { makeRng }

const KEYS = Object.keys(DEFAULT_WEIGHTS) as (keyof HeuristicWeights)[]

const BOUNDS: Partial<Record<keyof HeuristicWeights, [number, number]>> = {
  lockProgress: [0, 20],
  missExponent: [0, 8],
  edgePenalty: [0, 6],
  edgeRewardAfterFive: [0, 10],
  blockOpponent: [0, 15],
  focusRowBonus: [0, 20],
  marginalRowPenalty: [0, 20],
  middleNumberBonus: [0, 15],
  lockNowBonus: [0, 20],
  investedRowUrgency: [0, 15],
  forcedMissWeight: [0, 10],
  deathDoorMissMultiplier: [1, 12],
  oppWeight: [0.4, 1.6],
  passWhite: [-4, 6],
  passColor: [-1, 6],
  continuationBonus: [0, 12],
  startRowBonus: [0, 10],
  strandedPenalty: [0, 40],
  almostLock: [0, 15],
  endWhileBehind: [0, 40],
}

export function clipWeights(w: HeuristicWeights): HeuristicWeights {
  const out = { ...w }
  for (const k of KEYS) {
    const [lo, hi] = BOUNDS[k] ?? [-5, 40]
    out[k] = Math.min(hi, Math.max(lo, out[k]))
  }
  return out
}

function randn(rng: () => number): number {
  const u = Math.max(1e-9, rng())
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function mutateWeights(w: HeuristicWeights, sigma: number, rng: () => number): HeuristicWeights {
  const out = { ...w }
  for (const k of KEYS) {
    if (rng() > 0.55) continue
    const scale = Math.abs(w[k]) * 0.35 + 0.35
    out[k] = w[k] + randn(rng) * sigma * scale
  }
  return clipWeights(out)
}

function die(rng: () => number): number {
  return 1 + Math.floor(rng() * 6)
}

function greedyPick(state: ClassicGameState, player: ClassicPlayerId, kind: "white" | "color"): ClassicMove | null {
  const moves = kind === "white" ? getWhiteSumMoves(state, player) : getColorMoves(state, player)
  const before = totalScore(playerRef(state, player))
  let best: ClassicMove | null = null
  // Match the old normal bot: white needs +3, color needs +1.
  let bestRank = (kind === "white" ? 3 : 1) - 1e-6
  for (const m of moves) {
    const next = applyMark(state, player, m.color, m.index)
    if (!next) continue
    let rank = totalScore(playerRef(next, player)) - before
    const n = playerRef(state, player).rows[m.color].marks.length
    if (n === 4) rank += 8
    if (n >= 5) rank += 3
    if (rank > bestRank) {
      bestRank = rank
      best = m
    }
  }
  return best
}

function gapOf(state: ClassicGameState, player: ClassicPlayerId, move: ClassicMove): number {
  const row = playerRef(state, player).rows[move.color]
  const high = row.marks.length ? Math.max(...row.marks) : -1
  return move.index - high - 1
}

/** Rule bot that actually finishes rows: small gaps on white, avoid misses on color. */
function takerPick(state: ClassicGameState, player: ClassicPlayerId, kind: "white" | "color"): ClassicMove | null {
  const moves = kind === "white" ? getWhiteSumMoves(state, player) : getColorMoves(state, player)
  if (moves.length === 0) return null
  const ranked = [...moves].sort((a, b) => gapOf(state, player, a) - gapOf(state, player, b))
  const best = ranked[0]!
  const gap = gapOf(state, player, best)
  if (kind === "white") return gap <= 2 ? best : null
  return gap <= 4 ? best : null
}

function choose(state: ClassicGameState, player: ClassicPlayerId, kind: "white" | "color", policy: SeatPolicy): ClassicMove | null {
  if (policy === "greedy") return greedyPick(state, player, kind)
  if (policy === "taker") return takerPick(state, player, kind)
  return fastPick(state, player, kind, policy)
}

/** One game. `rng` supplies every die so candidates can share seeds. */
export function playGame(human: SeatPolicy, ai: SeatPolicy, rng: () => number): { human: number; ai: number } {
  let state = createClassicVsAi("H", "A")
  let prev = ""
  for (let step = 0; step < 500 && state.phase !== "ended"; step++) {
    const phase = state.phase
    if (phase === prev && phase !== "roll") break
    prev = phase

    if (phase === "roll") {
      state = rollDice(state, [die(rng), die(rng), die(rng), die(rng), die(rng), die(rng)])
      continue
    }
    if (phase === "whiteHuman") {
      const m = choose(state, "human", "white", human)
      if (m) state = applyMark(state, "human", m.color, m.index) ?? state
      state = skipWhiteHuman(state)
      continue
    }
    if (phase === "whiteAi") {
      const m = choose(state, "ai", "white", ai)
      if (m) state = applyMark(state, "ai", m.color, m.index) ?? state
      state = afterWhiteAi(state)
      continue
    }
    if (phase === "colorHuman" && state.active === "human") {
      const m = choose(state, "human", "color", human)
      if (m) state = applyMark(state, "human", m.color, m.index) ?? state
      state = endColorHuman(state)
      continue
    }
    if (phase === "colorAi" && state.active === "ai") {
      const m = choose(state, "ai", "color", ai)
      if (m) state = applyMark(state, "ai", m.color, m.index) ?? state
      state = afterColorAi(state)
      continue
    }
    state = finishTurn(state)
  }
  if (process.env.DEBUG_GAME) {
    const brief = (p: typeof state.human) => ({
      score: totalScore(p),
      pen: p.penalties,
      rows: Object.fromEntries(
        (["red", "yellow", "green", "blue"] as const).map((c) => [c, p.rows[c].marks.length + (p.rows[c].locked ? "L" : "")]),
      ),
    })
    console.log("end", state.phase, "steps", "human", brief(state.human), "ai", brief(state.ai))
  }
  return { human: totalScore(state.human), ai: totalScore(state.ai) }
}

export interface MatchupStats {
  /** Mean (my score − opp score). Seats alternate so first-player bias cancels. */
  margin: number
  wins: number
  losses: number
  ties: number
  /** Mean of my sheet score in games I won. Null if no wins. */
  avgScoreWins: number | null
  /** Mean of my sheet score in games I lost. Null if no losses. */
  avgScoreLosses: number | null
  avgMyScore: number
  avgOppScore: number
}

/** Full matchup breakdown. Seats alternate so first-player bias cancels. */
export function matchupStats(mine: SeatPolicy, opp: SeatPolicy, seeds: number[]): MatchupStats {
  let marginSum = 0
  let mySum = 0
  let oppSum = 0
  let wins = 0
  let losses = 0
  let ties = 0
  let winScoreSum = 0
  let lossScoreSum = 0
  for (let i = 0; i < seeds.length; i++) {
    const rng = makeRng(seeds[i]!)
    const swap = i % 2 === 1
    const res = swap ? playGame(opp, mine, rng) : playGame(mine, opp, rng)
    const my = swap ? res.ai : res.human
    const their = swap ? res.human : res.ai
    marginSum += my - their
    mySum += my
    oppSum += their
    if (my > their) {
      wins += 1
      winScoreSum += my
    } else if (my < their) {
      losses += 1
      lossScoreSum += my
    } else {
      ties += 1
    }
  }
  const n = seeds.length
  return {
    margin: n ? marginSum / n : 0,
    wins,
    losses,
    ties,
    avgScoreWins: wins ? winScoreSum / wins : null,
    avgScoreLosses: losses ? lossScoreSum / losses : null,
    avgMyScore: n ? mySum / n : 0,
    avgOppScore: n ? oppSum / n : 0,
  }
}

/** Mean (my score − opp score). Seats alternate so first-player bias cancels. */
export function marginBetween(mine: SeatPolicy, opp: SeatPolicy, seeds: number[]): number {
  return matchupStats(mine, opp, seeds).margin
}

export function generationSeeds(generation: number, games: number, salt: number): number[] {
  const out: number[] = []
  for (let i = 0; i < games; i++) out.push((generation * 100003 + i * 997 + salt) >>> 0)
  return out
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("evolve.ts")) {
  const t = Date.now()
  const r = playGame(DEFAULT_WEIGHTS, "greedy", makeRng(1))
  console.assert(Number.isFinite(r.human) && Number.isFinite(r.ai), "game finishes with scores")
  const m = marginBetween(DEFAULT_WEIGHTS, "greedy", generationSeeds(0, 20, 1))
  console.log("evolve ok", r, "margin20", m.toFixed(2), "ms", Date.now() - t)
}
