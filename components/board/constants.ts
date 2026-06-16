// Shared layout + palette for the 3D board. Tiles live on the XZ plane (top
// face pointing +Y); the camera looks down at the board from the front.

export const TILE = 1
export const GAP = 0.16
export const PITCH = TILE + GAP
export const DEPTH = 0.36

export const COLORS = {
  base: "#0b0b18",
  cyan: "#22d3ee",
  green: "#34d399",
  red: "#f43f5e",
  blue: "#3b82f6",
  amber: "#f59e0b",
  bg: "#0a0a12",
} as const

/** Centered axis coordinate for grid index `k` of an `n`-wide board. */
export function coord(k: number, n: number): number {
  return (k - (n - 1) / 2) * PITCH
}
