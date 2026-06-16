import * as THREE from "three"
import type { CellState } from "@/lib/sumplete-engine"

// A board style is a pure data description of the scene's look + feel. All three
// board components read from it, so adding a style means adding a preset here —
// no component changes.

export type BoardStyleId = "neon" | "minimal" | "playful"

type StateColors = {
  normal: string
  deleted: string
  circle: string
  mistake: string
  hint: string
}

export type BoardStyle = {
  id: BoardStyleId
  label: string
  /** Bright emissive glyphs/rings (bloom on) vs. matte tone-mapped look. */
  glow: boolean
  background: string
  fog: boolean
  bloom: { enabled: boolean; intensity: number; threshold: number; smoothing: number; radius: number }
  lights: {
    ambient: number
    dir: number
    dirPos: [number, number, number]
    points: { color: string; intensity: number; position: [number, number, number]; distance: number }[]
  }
  tile: {
    metalness: number
    roughness: number
    radius: number
    depth: number
    baseIntensity: number
    hoverIntensity: number
    circleIntensity: number
    deletedIntensity: number
    lift: number
    sink: number
    stiffness: number
    bounce: boolean
    pulseBaseIntensity: number
    mistakePulse: number
    hintPulse: number
  }
  /** Diffuse surface colour of the tile body per state. */
  surface: StateColors
  /** Emissive / accent colours per state, plus glyph + marker colours. */
  colors: StateColors & {
    digit: string
    ring: string
    x: string
    labelNormal: string
    labelCorrect: string
    win: string
  }
}

export const NEON: BoardStyle = {
  id: "neon",
  label: "Arcade Neon",
  glow: true,
  background: "#0a0a12",
  fog: true,
  bloom: { enabled: true, intensity: 0.9, threshold: 0.25, smoothing: 0.4, radius: 0.7 },
  lights: {
    ambient: 0.5,
    dir: 0.9,
    dirPos: [5, 9, 6],
    points: [
      { color: "#22d3ee", intensity: 22, position: [-4, 5, 4], distance: 40 },
      { color: "#3b82f6", intensity: 16, position: [5, 5, -4], distance: 40 },
    ],
  },
  tile: {
    metalness: 0.3,
    roughness: 0.35,
    radius: 0.1,
    depth: 0.36,
    baseIntensity: 0.55,
    hoverIntensity: 1.0,
    circleIntensity: 1.15,
    deletedIntensity: 0.22,
    lift: 0.3,
    sink: -0.34,
    stiffness: 10,
    bounce: false,
    pulseBaseIntensity: 0.6,
    mistakePulse: 1.3,
    hintPulse: 1.1,
  },
  surface: {
    normal: "#0b0b18",
    deleted: "#0b0b18",
    circle: "#0b0b18",
    mistake: "#0b0b18",
    hint: "#0b0b18",
  },
  colors: {
    normal: "#22d3ee",
    deleted: "#f43f5e",
    circle: "#34d399",
    mistake: "#f43f5e",
    hint: "#3b82f6",
    digit: "#22d3ee",
    ring: "#34d399",
    x: "#f43f5e",
    labelNormal: "#22d3ee",
    labelCorrect: "#34d399",
    win: "#34d399",
  },
}

export const MINIMAL: BoardStyle = {
  id: "minimal",
  label: "Clean Minimal",
  glow: false,
  background: "#eef2f6",
  fog: false,
  bloom: { enabled: false, intensity: 0, threshold: 1, smoothing: 0.2, radius: 0.4 },
  lights: {
    ambient: 0.85,
    dir: 1.0,
    dirPos: [4, 8, 5],
    points: [{ color: "#ffffff", intensity: 8, position: [-3, 6, 3], distance: 40 }],
  },
  tile: {
    metalness: 0.0,
    roughness: 0.85,
    radius: 0.14,
    depth: 0.3,
    baseIntensity: 0.0,
    hoverIntensity: 0.12,
    circleIntensity: 0.25,
    deletedIntensity: 0.0,
    lift: 0.14,
    sink: -0.16,
    stiffness: 12,
    bounce: false,
    pulseBaseIntensity: 0.1,
    mistakePulse: 0.5,
    hintPulse: 0.4,
  },
  surface: {
    normal: "#ffffff",
    deleted: "#e2e8f0",
    circle: "#dcfce7",
    mistake: "#fee2e2",
    hint: "#dbeafe",
  },
  colors: {
    normal: "#64748b",
    deleted: "#94a3b8",
    circle: "#22c55e",
    mistake: "#ef4444",
    hint: "#3b82f6",
    digit: "#0f172a",
    ring: "#22c55e",
    x: "#ef4444",
    labelNormal: "#334155",
    labelCorrect: "#16a34a",
    win: "#22c55e",
  },
}

export const PLAYFUL: BoardStyle = {
  id: "playful",
  label: "Playful Blocks",
  glow: false,
  background: "#fdf2e9",
  fog: false,
  bloom: { enabled: false, intensity: 0, threshold: 1, smoothing: 0.2, radius: 0.4 },
  lights: {
    ambient: 0.7,
    dir: 1.2,
    dirPos: [4, 9, 5],
    points: [{ color: "#fb923c", intensity: 12, position: [-4, 5, 4], distance: 40 }],
  },
  tile: {
    metalness: 0.05,
    roughness: 0.55,
    radius: 0.22,
    depth: 0.55,
    baseIntensity: 0.0,
    hoverIntensity: 0.1,
    circleIntensity: 0.15,
    deletedIntensity: 0.0,
    lift: 0.35,
    sink: -0.2,
    stiffness: 16,
    bounce: true,
    pulseBaseIntensity: 0.1,
    mistakePulse: 0.5,
    hintPulse: 0.4,
  },
  surface: {
    normal: "#fcd34d",
    deleted: "#fca5a5",
    circle: "#86efac",
    mistake: "#f87171",
    hint: "#93c5fd",
  },
  colors: {
    normal: "#f59e0b",
    deleted: "#ef4444",
    circle: "#22c55e",
    mistake: "#dc2626",
    hint: "#2563eb",
    digit: "#7c2d12",
    ring: "#16a34a",
    x: "#dc2626",
    labelNormal: "#9a3412",
    labelCorrect: "#15803d",
    win: "#f59e0b",
  },
}

export const STYLES: Record<BoardStyleId, BoardStyle> = {
  neon: NEON,
  minimal: MINIMAL,
  playful: PLAYFUL,
}

export const STYLE_LIST: BoardStyle[] = [NEON, MINIMAL, PLAYFUL]

export function getStyle(id: string | null | undefined): BoardStyle {
  return (id && STYLES[id as BoardStyleId]) || NEON
}

// Shared, cached THREE.Color objects keyed by hex. Never mutate the returned
// instance — callers lerp into their own local Color toward these targets.
const colorCache = new Map<string, THREE.Color>()
export function color(hex: string): THREE.Color {
  let c = colorCache.get(hex)
  if (!c) {
    c = new THREE.Color(hex)
    colorCache.set(hex, c)
  }
  return c
}

export type TileTarget = { y: number; surface: string; emissive: string; intensity: number }

/** Resolve a tile's target pose + colours from its state under a given style. */
export function resolveTile(style: BoardStyle, cell: CellState, hovered: boolean, t: number): TileTarget {
  const s = style.tile
  const target: TileTarget = { y: 0, surface: style.surface.normal, emissive: style.colors.normal, intensity: s.baseIntensity }

  if (cell.deleted) {
    target.y = s.sink
    target.surface = style.surface.deleted
    target.emissive = style.colors.deleted
    target.intensity = s.deletedIntensity
  } else if (cell.circle) {
    target.y = s.lift
    target.surface = style.surface.circle
    target.emissive = style.colors.circle
    target.intensity = s.circleIntensity
  } else if (hovered) {
    target.intensity = s.hoverIntensity
  }

  if (cell.mistake) {
    target.surface = style.surface.mistake
    target.emissive = style.colors.mistake
    target.intensity = s.pulseBaseIntensity + (Math.sin(t * 7) * 0.5 + 0.5) * s.mistakePulse
  } else if (cell.hint) {
    target.surface = style.surface.hint
    target.emissive = style.colors.hint
    target.intensity = s.pulseBaseIntensity + (Math.sin(t * 5) * 0.5 + 0.5) * s.hintPulse
  }

  return target
}
