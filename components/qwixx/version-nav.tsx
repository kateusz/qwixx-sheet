import Link from "next/link"
import { cn } from "@/lib/utils"

const MODES = [
  { href: "/", id: "classic", label: "Classic" },
  { href: "/classic-ai", id: "classic-ai", label: "vs AI" },
  { href: "/chains", id: "chains", label: "Chains" },
  { href: "/duel", id: "duel", label: "Duel" },
] as const

export type GameMode = (typeof MODES)[number]["id"]

export function VersionNav({ active }: { active: GameMode }) {
  return (
    <nav className="flex shrink-0 gap-0.5 rounded-xl bg-muted p-0.5 sm:gap-1 sm:p-1" aria-label="Game version">
      {MODES.map(({ href, id, label }) => (
        <Link
          key={id}
          href={href}
          className={cn(
            "rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors sm:px-3 sm:text-sm",
            active === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
