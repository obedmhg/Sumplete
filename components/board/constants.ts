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

export const CHAR_SPEED = 3.4 // world units per second

// Continuous character state, mutated in the render loop and read by tiles +
// the jump handler. `row`/`col` is the tile under the character, or -1 when it
// has wandered off the board.
export type CharState = {
  x: number
  z: number
  row: number
  col: number
  valid: boolean
}
