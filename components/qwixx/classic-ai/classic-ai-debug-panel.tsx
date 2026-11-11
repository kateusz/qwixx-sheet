"use client"

import type { AiDecision } from "@/lib/qwixx-ai"
import type { ColorKey } from "@/lib/qwixx"

const COLOR_PL: Record<ColorKey, string> = {
  red: "czerwony",
  yellow: "żółty",
  green: "zielony",
  blue: "niebieski",
}

export interface AiLogEntry {
  id: number
  at: string
  phase: "white" | "color" | "hint"
  who: "AI" | "Podpowiedź"
  decision: AiDecision
}

export function ClassicAiDebugPanel({
  log,
  hint,
  onHint,
  hintEnabled,
}: {
  log: AiLogEntry[]
  hint: AiLogEntry | null
  onHint: () => void
  hintEnabled: boolean
}) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Decyzje AI</h2>
        <button
          type="button"
          disabled={!hintEnabled}
          onClick={onHint}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold disabled:opacity-40"
        >
          Podpowiedz
        </button>
      </div>

      {hint && (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Co zrobiłoby AI na Twojej planszy
          </p>
          <DecisionBody entry={hint} />
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {log.length === 0 && (
          <p className="text-xs text-muted-foreground">Tu pojawią się ruchy AI z uzasadnieniem.</p>
        )}
        {[...log].reverse().map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-2.5 text-sm">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {entry.who} · {entry.phase === "white" ? "białe" : "kolor"}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{entry.at}</span>
            </div>
            <DecisionBody entry={entry} />
          </div>
        ))}
      </div>
    </aside>
  )
}

function DecisionBody({ entry }: { entry: AiLogEntry }) {
  const d = entry.decision
  const choice = d.choice
    ? `${COLOR_PL[d.choice.color]} ${d.choice.number}`
    : d.kind === "white"
      ? "pomija białe"
      : "pomija kolor / bierze karę"
  return (
    <div>
      <p className="font-bold">{choice}</p>
      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
        ocena {d.score.toFixed(1)} · próg pominięcia {d.skipScore.toFixed(1)}
      </p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
        {d.reasons.slice(0, 4).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
