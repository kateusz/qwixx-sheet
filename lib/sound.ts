"use client"

// Lightweight Web Audio sound effects. No assets required.
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

function blip(freq: number, duration: number, type: OscillatorType, gain = 0.06, delay = 0) {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === "suspended") void audio.resume()
  const start = audio.currentTime + delay
  const osc = audio.createOscillator()
  const vol = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  vol.gain.setValueAtTime(0.0001, start)
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(vol).connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export const sfx = {
  mark() {
    blip(660, 0.12, "triangle", 0.07)
    blip(990, 0.1, "sine", 0.04, 0.04)
  },
  lock() {
    blip(523, 0.1, "square", 0.05)
    blip(784, 0.1, "square", 0.05, 0.08)
    blip(1046, 0.18, "square", 0.05, 0.16)
  },
  penalty() {
    blip(180, 0.22, "sawtooth", 0.05)
  },
  roll() {
    for (let i = 0; i < 5; i++) {
      blip(300 + Math.random() * 400, 0.05, "square", 0.03, i * 0.09)
    }
  },
  win() {
    ;[523, 659, 784, 1046].forEach((f, i) => blip(f, 0.25, "triangle", 0.06, i * 0.12))
  },
}
