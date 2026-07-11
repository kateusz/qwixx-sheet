import type { Metadata } from "next"
import { QwixxClassicAiGame } from "@/components/qwixx/classic-ai/qwixx-classic-ai-game"

export const metadata: Metadata = {
  title: "Qwixx Classic vs AI",
  description: "Play classic Qwixx against the computer",
}

export default function ClassicAiPage() {
  return <QwixxClassicAiGame />
}
