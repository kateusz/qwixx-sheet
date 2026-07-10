import Link from "next/link"
import { cn } from "@/lib/utils"

export function VersionNav({ active }: { active: "classic" | "chains" }) {
  return (
    <nav className="flex shrink-0 gap-1 rounded-xl bg-muted p-1" aria-label="Game version">
      <Link
        href="/"
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:text-sm",
          active === "classic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Classic
      </Link>
      <Link
        href="/chains"
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:text-sm",
          active === "chains" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Chains
      </Link>
    </nav>
  )
}
