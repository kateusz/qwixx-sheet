"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHAIN_PAIRS, chainIndicesForRow } from "@/lib/qwixx-chains"
import { ROWS, cellStatus, rowMarkCount, rowScore, type ColorKey, type RowConfig, type RowState } from "@/lib/qwixx"

interface ChainScoreRowProps {
  config: RowConfig
  row: RowState
  disabled: boolean
  onMark: (index: number) => void
  cellRef?: (index: number, el: HTMLButtonElement | null) => void
}

export function ChainScoreRow({ config, row, disabled, onMark, cellRef }: ChainScoreRowProps) {
  const marks = rowMarkCount(row)
  const chainIndices = chainIndicesForRow(config.key)

  return (
    <div className={cn("flex items-center gap-1.5 rounded-2xl px-2 py-2 sm:gap-2 sm:px-3", config.band)}>
      <span
        aria-hidden
        className={cn("shrink-0", config.flag)}
        style={{
          width: 0,
          height: 0,
          borderTop: "16px solid transparent",
          borderBottom: "16px solid transparent",
          borderLeft: "20px solid currentColor",
        }}
      />

      <div className="flex flex-1 items-center gap-1 sm:gap-1.5">
        {config.numbers.map((num, index) => {
          const status = cellStatus(row, index, config.numbers.length)
          const isMarked = status === "marked"
          const isAvailable = status === "available" && !disabled
          const isChain = chainIndices.includes(index)
          const canToggle = !disabled && (isAvailable || isMarked)
          const isSkipped = status === "skipped"

          return (
            <motion.button
              key={index}
              ref={(el) => cellRef?.(index, el)}
              type="button"
              disabled={!canToggle}
              onClick={() => canToggle && onMark(index)}
              aria-label={`${config.label} ${num}${isChain ? ", chain box" : ""}${isMarked ? ", crossed out, tap to remove" : ""}`}
              aria-pressed={isMarked}
              animate={
                isSkipped
                  ? { opacity: 0.35, rotate: [0, -5, 5, -3, 0] }
                  : { opacity: status === "locked-out" ? 0.45 : 1, rotate: 0 }
              }
              transition={{ duration: 0.35 }}
              whileHover={canToggle ? { scale: 1.12 } : undefined}
              whileTap={canToggle ? { scale: 0.9 } : undefined}
              className={cn(
                "relative z-10 flex aspect-square min-w-0 flex-1 items-center justify-center rounded-lg text-[13px] font-extrabold tabular-nums shadow-sm sm:rounded-xl sm:text-base",
                config.cell,
                config.ink,
                canToggle ? "cursor-pointer" : "cursor-default",
              )}
            >
              {isChain && <ChainRing />}
              <span className={cn("relative z-[1]", isMarked && "opacity-30")}>{num}</span>
              <AnimatePresence>
                {isMarked && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.25, 1], opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3, times: [0, 0.6, 1] }}
                    className={cn("absolute inset-0 z-[2] flex items-center justify-center", config.ink)}
                  >
                    <XMark />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}

        <motion.div
          aria-label={row.locked ? `${config.label} row locked` : `${config.label} lock`}
          animate={row.locked ? { scale: [1, 1.3, 1] } : { scale: 1, opacity: 0.85 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full shadow-sm",
            config.cell,
            config.ink,
          )}
        >
          <Lock className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={row.locked ? 3 : 2.25} />
        </motion.div>

        <div
          className={cn(
            "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-lg text-[13px] font-black tabular-nums shadow-sm sm:rounded-xl sm:text-base",
            config.cell,
            config.ink,
          )}
        >
          {rowScore(row)}
        </div>
      </div>

      <div className="hidden w-8 shrink-0 text-center text-white sm:block">
        <div className="text-base font-black tabular-nums leading-none">{marks}</div>
        <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">X</div>
      </div>
    </div>
  )
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[85%] w-[85%]" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round">
      <path d="M5 5 L19 19 M19 5 L5 19" />
    </svg>
  )
}

/** Dashed circle around chain boxes — matches the official sheet. */
function ChainRing() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-[5px] z-0 rounded-full border-[2.5px] border-dashed border-foreground sm:-inset-[6px] sm:border-[3px]"
    />
  )
}

interface ChainLink {
  x: number
  y1: number
  y2: number
  barHalf: number
}

/** Solid vertical link with horizontal caps (barbell shape). */
function ChainLinkGraphic({ x, y1, y2, barHalf }: ChainLink) {
  return (
    <g className="text-foreground">
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" />
      <line x1={x - barHalf} y1={y1} x2={x + barHalf} y2={y1} stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" />
      <line x1={x - barHalf} y1={y2} x2={x + barHalf} y2={y2} stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" />
    </g>
  )
}

/** px the dashed ring extends beyond the cell edge */
const RING_OUTSET = 5

/** Four rows plus SVG connectors between linked chain cells. */
export function ChainBoard({
  rows,
  disabled,
  onMark,
}: {
  rows: Record<ColorKey, RowState>
  disabled: boolean
  onMark: (color: ColorKey, index: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const [links, setLinks] = useState<ChainLink[]>([])

  const setCellRef = useCallback((color: ColorKey, index: number, el: HTMLButtonElement | null) => {
    const key = `${color}:${index}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }, [])

  const measureLinks = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()
    const next: ChainLink[] = []

    for (const { a, b } of CHAIN_PAIRS) {
      const elA = cellRefs.current.get(`${a.color}:${a.index}`)
      const elB = cellRefs.current.get(`${b.color}:${b.index}`)
      if (!elA || !elB) continue
      const rA = elA.getBoundingClientRect()
      const rB = elB.getBoundingClientRect()
      const x = rA.left + rA.width / 2 - cRect.left
      const barHalf = Math.min(rA.width * 0.32, 14)
      next.push({
        x,
        y1: rA.bottom - cRect.top + RING_OUTSET,
        y2: rB.top - cRect.top - RING_OUTSET,
        barHalf,
      })
    }
    setLinks(next)
  }, [])

  useLayoutEffect(() => {
    measureLinks()
    const ro = new ResizeObserver(measureLinks)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener("resize", measureLinks)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measureLinks)
    }
  }, [measureLinks, rows])

  return (
    <div ref={containerRef} className="relative">
      {links.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible" aria-hidden>
          {links.map((link, i) => (
            <ChainLinkGraphic key={i} {...link} />
          ))}
        </svg>
      )}

      <div className="relative space-y-3 sm:space-y-4">
        {ROWS.map((config) => (
          <ChainScoreRow
            key={config.key}
            config={config}
            row={rows[config.key]}
            disabled={disabled}
            onMark={(index) => onMark(config.key, index)}
            cellRef={(index, el) => setCellRef(config.key, index, el)}
          />
        ))}
      </div>
    </div>
  )
}
