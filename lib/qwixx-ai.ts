import {
  type ClassicGameState,
  type ClassicMove,
  type ClassicPlayerId,
  applyMark,
  afterColorAi,
  afterWhiteAi,
  getColorMoves,
  getWhiteSumMoves,
  randomRollValues,
  rollDice,
} from "./qwixx-classic-multi"
import { explainPick, fastLookaheadPick, fastPick, type AiDecision } from "./qwixx-ai/fastPolicy"
import { activeWeights } from "./qwixx-ai/heuristics"

export type AiDifficulty = "easy" | "normal" | "hard"
export type { AiDecision }

function easyPick(state: ClassicGameState, kind: "white" | "color"): ClassicMove | null {
  const moves = kind === "white" ? getWhiteSumMoves(state, "ai") : getColorMoves(state, "ai")
  if (Math.random() < 0.35) {
    if (moves.length === 0 || Math.random() < 0.25) return null
    return moves[Math.floor(Math.random() * moves.length)]!
  }
  return fastPick(state, "ai", kind, activeWeights())
}

export function aiPickWhiteSum(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  if (difficulty === "easy") return easyPick(state, "white")
  const w = activeWeights()
  if (difficulty === "hard") return fastLookaheadPick(state, "ai", "white", w, 3)
  return fastPick(state, "ai", "white", w)
}

export function aiPickColor(state: ClassicGameState, difficulty: AiDifficulty): ClassicMove | null {
  if (difficulty === "easy") return easyPick(state, "color")
  const w = activeWeights()
  if (difficulty === "hard") return fastLookaheadPick(state, "ai", "color", w, 3)
  return fastPick(state, "ai", "color", w)
}

/** Decision + reasons. Hard may override the 1-ply choice with lookahead. */
export function explainAiMove(
  state: ClassicGameState,
  kind: "white" | "color",
  difficulty: AiDifficulty,
  player: ClassicPlayerId = "ai",
): AiDecision {
  const w = activeWeights()
  const decision = explainPick(state, player, kind, w)
  if (difficulty === "easy") {
    return {
      ...decision,
      reasons: ["easy miesza z losowością; poniżej ocena normal", ...decision.reasons],
    }
  }
  if (difficulty === "hard") {
    const hard = fastLookaheadPick(state, player, kind, w, 3)
    const same = hard?.color === decision.choice?.color && hard?.index === decision.choice?.index
    if (same) {
      return { ...decision, reasons: ["hard: zgodne z lookaheadem", ...decision.reasons] }
    }
    return {
      ...decision,
      choice: hard,
      reasons: [
        hard ? `hard: lookahead wybrał ${hard.color} ${hard.number}` : "hard: lookahead woli pominąć",
        ...decision.reasons,
      ],
    }
  }
  return decision
}

export function runAiWhiteSum(
  state: ClassicGameState,
  difficulty: AiDifficulty,
): { state: ClassicGameState; decision: AiDecision } {
  let decision = explainAiMove(state, "white", difficulty, "ai")
  let next = state
  const picked = difficulty === "easy" ? easyPick(state, "white") : decision.choice
  if (difficulty === "easy") {
    decision = {
      ...decision,
      choice: picked,
      reasons: picked
        ? [`easy zagrało ${picked.color} ${picked.number}`, ...decision.reasons]
        : ["easy pominęło białe", ...decision.reasons],
    }
  }
  if (picked) next = applyMark(next, "ai", picked.color, picked.index) ?? next
  return { state: afterWhiteAi(next), decision }
}

export function runAiColor(
  state: ClassicGameState,
  difficulty: AiDifficulty,
): { state: ClassicGameState; decision: AiDecision } {
  let decision = explainAiMove(state, "color", difficulty, "ai")
  let next = state
  const picked = difficulty === "easy" ? easyPick(state, "color") : decision.choice
  if (difficulty === "easy") {
    decision = {
      ...decision,
      choice: picked,
      reasons: picked
        ? [`easy zagrało ${picked.color} ${picked.number}`, ...decision.reasons]
        : ["easy pominęło kolor / wzięło karę", ...decision.reasons],
    }
  }
  if (picked) next = applyMark(next, "ai", picked.color, picked.index) ?? next
  return { state: afterColorAi(next), decision }
}

export function runAiRoll(state: ClassicGameState): ClassicGameState {
  return rollDice(state, randomRollValues())
}
