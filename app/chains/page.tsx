import type { Metadata } from "next"
import { QwixxChainsGame } from "@/components/qwixx/chains/qwixx-chains-game"

export const metadata: Metadata = {
  title: "Qwixx Chains Score Sheet",
  description: "Digital score sheet for Qwixx Chains — linked chain boxes auto-mark across rows.",
}

export default function ChainsPage() {
  return <QwixxChainsGame />
}
