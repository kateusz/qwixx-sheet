import type { Metadata } from "next"
import { QwixxDuelGame } from "@/components/qwixx/duel/qwixx-duel-game"

export const metadata: Metadata = {
  title: "Qwixx Duel Score Sheet",
  description: "Two-player Qwixx Duel on one phone — beat, stack, and lock rows.",
}

export default function DuelPage() {
  return <QwixxDuelGame />
}
