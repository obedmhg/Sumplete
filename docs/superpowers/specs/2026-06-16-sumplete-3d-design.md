# Sumplete 3D — Design

Date: 2026-06-16

## Goal

Convert the existing 2D Sumplete puzzle (Next.js 15 / React 19 / Tailwind / shadcn)
into an interactive 3D version using three.js, keeping the base game mechanics
intact while adding sounds and visual effects on game events.

## Decisions (locked)

- **Renderer:** React Three Fiber (`@react-three/fiber`) + `@react-three/drei` +
  `@react-three/postprocessing`. Idiomatic for React 19 / Next 15; game state
  syncs naturally with React.
- **Scope:** Replace the 2D game entirely. Single 3D experience on the home page.
- **Audio:** Web Audio API synth — tones generated in code. No asset files, no
  licensing. Mute toggle.
- **Visual style:** Arcade neon — dark scene, emissive glowing tiles, Bloom
  post-processing, particle effects.

## Base mechanics (preserved verbatim)

Sumplete: an N×N grid (N = 3–9) of random integers (1–9, or −9–9 if negatives
enabled). Each cell is randomly flagged as part of the hidden solution. Row and
column **target sums** are computed from solution cells only. The player clicks
cells to delete the non-solution numbers so every row and column sums to its
target.

Cell click cycle (unchanged): `normal → deleted (X) → circle (keep-mark) → normal`.
A cell marked by a **hint** is locked and not clickable.

Existing features all retained: Hint, Reveal solution (with confirm), Check
mistakes / Remove mistakes, Restart, grid size select (3–9), negative-numbers
toggle, Share, and localStorage persistence.

## Dependencies to add

- `three`
- `@react-three/fiber`
- `@react-three/drei` — `Text`, `OrbitControls`, `RoundedBox`
- `@react-three/postprocessing` — `Bloom` (the glow that sells the neon look)

## Architecture

Keep the (pure, well-written) game logic; replace only the rendering layer.

- `lib/sumplete-engine.ts` — pure functions extracted from `sumplete.tsx`:
  `generateGame(size, allowNegative)`, `updateGameStatus(state)`, cell-cycle
  transition, `applyHint`, `revealSolution`, `markMistakes`, `removeMistakes`.
  No React imports. Fully unit-testable.
- `lib/sound.ts` — Web Audio singleton.
  `play('click' | 'delete' | 'circle' | 'correct' | 'error' | 'win')`.
  Lazy `AudioContext`, unlocked on first user gesture (browser autoplay policy).
  Mute state persisted to localStorage (`sumplete-muted`).
- `components/sumplete-3d.tsx` — top-level component. Holds React game state
  (same `GameState` / `CellState` shape as today), wires click handlers to the
  engine + sound, renders the R3F `<Canvas>` plus the HTML controls overlay.
- `components/board/Tile.tsx` — one cell. Maps cell state → 3D visual + animation.
- `components/board/SumLabel.tsx` — 3D text for a row/column target sum; glows
  green + check when that line is correct.
- `components/board/Effects.tsx` — postprocessing (Bloom).
- `components/board/WinBurst.tsx` — particle explosion on win.
- `app/page.tsx` — renders `<Sumplete3D />` instead of `<Sumplete />`.
- `components/sumplete.tsx` — **deleted**.

## Scene

- Background `#0a0a12` (near-black).
- Perspective camera tilted ~35° looking down at the board, centered on grid.
- `OrbitControls` clamped: limited polar + azimuth angles, no panning, bounded
  zoom — player can swivel for flair but cannot lose the board.
- Lighting: low ambient + one rim/directional light for edge definition.
- Bloom post-process pass for the neon glow.

## Tile — state → visual

Each cell is a `RoundedBox` with an emissive neon material and a 3D number
floating on its top face. All transitions spring-animated via `lerp` in
`useFrame` (target values driven by cell state).

| State | Visual | Sound |
|-------|--------|-------|
| normal | cyan edge glow, flat on board | `click` (on return to normal) |
| deleted (X) | sinks into board + dims, red glowing X overlay, particle puff | `delete` |
| circle (keep-mark) | lifts slightly + green emissive ring | `circle` |
| mistake | pulsing red flash | (set by Check mistakes) |
| hint | pulsing blue glow, **not clickable** | — |

## Sum labels

drei `<Text>` at the end of each row and bottom of each column showing the
target. Reuses `rowStatus` / `colStatus`: turns green, glows, and shows a check
mark when that line's current sum equals its target.

## Effects on events

- **Row/column becomes correct:** that line's tiles flash a green pulse;
  `correct` chime.
- **Win** (all rows + cols correct): full-board green wave, `WinBurst` particle
  explosion, brief camera shake, `win` fanfare, HTML overlay
  "Puzzle Solved! Well done!" with a Play Again button.
- **Check mistakes finds errors:** offending tiles flash red; `error` buzz.

## Controls UI

Existing shadcn controls rendered as an HTML overlay below the canvas (not in
3D): Errors, Hint, Restart, Reveal, grid-size Select (3–9), negative-numbers
Checkbox, Share — same handlers, now routed through the engine + sound. Plus a
new **mute** toggle.

## Persistence

Same localStorage keys: `sumplete-game`, `sumplete-size`, `sumplete-negative`.
New: `sumplete-muted`.

## Testing

Vitest unit tests on `lib/sumplete-engine.ts`:
- generated grid's solution-cell sums equal the published row/col targets;
- cell-cycle transition order (normal → deleted → circle → normal);
- mistake cell returns to normal first;
- win detection true only when all rows + cols match;
- hint logic flips a wrongly-kept or wrongly-deleted cell and locks it.

3D rendering is not unit-tested (canvas).

## Out of scope (YAGNI)

Physics engine, imported GLTF models, multiplayer, mobile gyro/tilt controls,
audio asset files.
