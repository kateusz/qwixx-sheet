import type { ClassicGameState, ClassicMove, ClassicPlayerId } from "../qwixx-classic-multi"
import { playerRef } from "../qwixx-classic-multi"
import { buildGameState, type GameState, type Move } from "./gameState"

function sheetFromPlayer(state: ClassicGameState, id: ClassicPlayerId): GameState["self"] {
  const p = playerRef(state, id)
  return {
    rows: {
      red: { marks: [...p.rows.red.marks], locked: p.rows.red.locked },
      yellow: { marks: [...p.rows.yellow.marks], locked: p.rows.yellow.locked },
      green: { marks: [...p.rows.green.marks], locked: p.rows.green.locked },
      blue: { marks: [...p.rows.blue.marks], locked: p.rows.blue.locked },
    },
    penalties: p.penalties,
  }
}

function phaseFromClassic(state: ClassicGameState, aiId: ClassicPlayerId): GameState["phase"] {
  switch (state.phase) {
    case "roll":
      return "roll"
    case "whiteHuman":
      return aiId === "human" ? "whiteSelf" : "whiteOpp"
    case "whiteAi":
      return aiId === "ai" ? "whiteSelf" : "whiteOpp"
    case "colorHuman":
      return aiId === "human" ? "colorSelf" : "colorOpp"
    case "colorAi":
      return aiId === "ai" ? "colorSelf" : "colorOpp"
    case "ended":
      return "ended"
    default:
      return "roll"
  }
}

export function classicToGameState(state: ClassicGameState, aiId: ClassicPlayerId = "ai"): GameState {
  const oppId: ClassicPlayerId = aiId === "ai" ? "human" : "ai"
  return buildGameState(sheetFromPlayer(state, aiId), sheetFromPlayer(state, oppId), {
    selfIsActive: state.active === aiId,
    phase: phaseFromClassic(state, aiId),
    roll: state.roll ? { values: [...state.roll.values], whiteSum: state.roll.whiteSum } : null,
    selfWhiteUsed: aiId === "human" ? state.humanWhiteUsed : state.aiWhiteUsed,
    oppWhiteUsed: aiId === "human" ? state.aiWhiteUsed : state.humanWhiteUsed,
    colorMoveUsed: state.colorMoveUsed,
    selfPlacedThisTurn: state.turnPlaced && state.active === aiId,
  })
}

export function moveToClassic(move: Move | null): ClassicMove | null {
  if (!move || move.kind !== "mark" || move.color === undefined || move.index === undefined || move.number === undefined) {
    return null
  }
  return { color: move.color, index: move.index, number: move.number }
}
