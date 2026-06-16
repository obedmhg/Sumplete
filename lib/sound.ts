// Tiny Web Audio synth. No asset files — every sound is generated from
// oscillators. A single lazily-created AudioContext is shared, and unlocked on
// the first user gesture to satisfy browser autoplay policy.

export type SoundName = "click" | "delete" | "circle" | "correct" | "error" | "win"

const MUTED_KEY = "sumplete-muted"

let ctx: AudioContext | null = null
let muted = false

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

/** Call from a click/tap handler to satisfy autoplay restrictions. */
export function unlockAudio(): void {
  const c = audioContext()
  if (c && c.state === "suspended") void c.resume()
}

export function isMuted(): boolean {
  if (typeof window !== "undefined") {
    const v = window.localStorage.getItem(MUTED_KEY)
    if (v != null) muted = v === "true"
  }
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  if (typeof window !== "undefined") window.localStorage.setItem(MUTED_KEY, String(value))
}

type ToneOpts = {
  freq: number
  duration: number
  type?: OscillatorType
  gain?: number
  delay?: number
  slideTo?: number
}

function tone({ freq, duration, type = "sine", gain = 0.18, delay = 0, slideTo }: ToneOpts): void {
  const c = audioContext()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const env = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration)
  env.gain.setValueAtTime(0.0001, t0)
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(env).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.03)
}

export function play(name: SoundName): void {
  if (muted) return
  const c = audioContext()
  if (!c) return
  if (c.state === "suspended") void c.resume()

  switch (name) {
    case "click":
      tone({ freq: 440, duration: 0.06, type: "triangle", gain: 0.12 })
      break
    case "delete":
      tone({ freq: 240, duration: 0.18, type: "sawtooth", gain: 0.16, slideTo: 90 })
      break
    case "circle":
      tone({ freq: 520, duration: 0.13, type: "sine", gain: 0.15, slideTo: 820 })
      break
    case "correct":
      tone({ freq: 660, duration: 0.12, type: "sine", gain: 0.16 })
      tone({ freq: 990, duration: 0.16, type: "sine", gain: 0.14, delay: 0.1 })
      break
    case "error":
      tone({ freq: 150, duration: 0.26, type: "square", gain: 0.14 })
      tone({ freq: 120, duration: 0.26, type: "square", gain: 0.12, delay: 0.04 })
      break
    case "win": {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((f, i) =>
        tone({ freq: f, duration: 0.22, type: "triangle", gain: 0.16, delay: i * 0.11 }),
      )
      break
    }
  }
}
