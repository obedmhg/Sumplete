// Pure game logic for Sumplete. No React, no DOM — fully unit-testable.
//
// Sumplete: an N×N grid of integers. Each cell is secretly part of the solution
// or not. Row/column target sums are computed from solution cells only. The
// player deletes the non-solution numbers so every row and column matches its
// target.

export type CellState = {
  value: number
  deleted: boolean
  circle: boolean
  mistake: boolean
  hint: boolean
  solution: boolean
}

export type LineStatus = "correct" | "incorrect" | "pending"

export type GameState = {
  grid: CellState[][]
  rowSums: number[]
  colSums: number[]
  rowStatus: LineStatus[]
  colStatus: LineStatus[]
  gameWon: boolean
  gameRevealed: boolean
}

type Rand = () => number

function cloneGrid(grid: CellState[][]): CellState[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })))
}

/** Build a fresh puzzle. `rand` is injectable for deterministic tests. */
export function generateGame(size: number, useNegative: boolean, rand: Rand = Math.random): GameState {
  const grid: CellState[][] = []

  for (let i = 0; i < size; i++) {
    const row: CellState[] = []
    for (let j = 0; j < size; j++) {
      const min = useNegative ? -9 : 1
      const max = 9
      const value = Math.floor(rand() * (max - min + 1)) + min
      const isSolution = rand() < 0.5
      row.push({
        value,
        deleted: false,
        circle: false,
        mistake: false,
        hint: false,
        solution: isSolution,
      })
    }
    grid.push(row)
  }

  const rowSums: number[] = []
  for (let i = 0; i < size; i++) {
    let sum = 0
    for (let j = 0; j < size; j++) {
      if (grid[i][j].solution) sum += grid[i][j].value
    }
    rowSums.push(sum)
  }

  const colSums: number[] = []
  for (let j = 0; j < size; j++) {
    let sum = 0
    for (let i = 0; i < size; i++) {
      if (grid[i][j].solution) sum += grid[i][j].value
    }
    colSums.push(sum)
  }

  return {
    grid,
    rowSums,
    colSums,
    rowStatus: Array(size).fill("pending"),
    colStatus: Array(size).fill("pending"),
    gameWon: false,
    gameRevealed: false,
  }
}

/** Recompute row/col status and win flag from the current grid. Returns a new state. */
export function updateGameStatus(state: GameState): GameState {
  const { grid, rowSums, colSums } = state
  const rows = grid.length
  const cols = grid[0]?.length ?? 0

  const rowStatus: LineStatus[] = rowSums.map((target, r) => {
    const current = grid[r].filter((c) => !c.deleted).reduce((s, c) => s + c.value, 0)
    return current === target ? "correct" : "incorrect"
  })

  const colStatus: LineStatus[] = colSums.map((target, c) => {
    let current = 0
    for (let r = 0; r < rows; r++) {
      if (!grid[r][c].deleted) current += grid[r][c].value
    }
    return current === target ? "correct" : "incorrect"
  })

  const gameWon =
    cols > 0 && rowStatus.every((s) => s === "correct") && colStatus.every((s) => s === "correct")

  return { ...state, rowStatus, colStatus, gameWon }
}

/** Outcome of clicking a cell — lets the UI pick the right sound/effect. */
export type CycleResult = "deleted" | "circle" | "normal" | "blocked"

/** Apply the click cycle to a cell: normal → deleted → circle → normal.
 *  A mistake-flagged cell returns straight to normal. Hint cells are locked.
 *  Returns the new state plus what the cell became. */
export function cycleCell(
  state: GameState,
  row: number,
  col: number,
): { state: GameState; result: CycleResult } {
  if (state.gameWon || state.gameRevealed || state.grid[row][col].hint) {
    return { state, result: "blocked" }
  }

  const grid = cloneGrid(state.grid)
  const cell = grid[row][col]
  let result: CycleResult

  if (cell.mistake) {
    cell.deleted = false
    cell.circle = false
    cell.mistake = false
    result = "normal"
  } else if (cell.deleted) {
    cell.deleted = false
    cell.circle = true
    result = "circle"
  } else if (cell.circle) {
    cell.circle = false
    result = "normal"
  } else {
    cell.deleted = true
    cell.circle = false
    result = "deleted"
  }

  return { state: updateGameStatus({ ...state, grid }), result }
}

/** Reveal one correct move and lock that cell. `rand` injectable for tests.
 *  Returns the new state and whether a hint was actually applied. */
export function applyHint(state: GameState, rand: Rand = Math.random): { state: GameState; applied: boolean } {
  if (state.gameWon || state.gameRevealed) return { state, applied: false }

  const grid = cloneGrid(state.grid)
  const rows = grid.length
  const cols = grid[0].length

  // Cells that should be deleted but aren't.
  const shouldDelete: Array<{ i: number; j: number }> = []
  // Cells that should be kept but are deleted.
  const wronglyDeleted: Array<{ i: number; j: number }> = []

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const c = grid[i][j]
      if (c.hint) continue
      if (!c.solution && !c.deleted) shouldDelete.push({ i, j })
      else if (c.solution && c.deleted) wronglyDeleted.push({ i, j })
    }
  }

  if (shouldDelete.length > 0) {
    const { i, j } = shouldDelete[Math.floor(rand() * shouldDelete.length)]
    grid[i][j].hint = true
    grid[i][j].deleted = true
    grid[i][j].circle = false
  } else if (wronglyDeleted.length > 0) {
    const { i, j } = wronglyDeleted[Math.floor(rand() * wronglyDeleted.length)]
    grid[i][j].hint = true
    grid[i][j].deleted = false
  } else {
    return { state, applied: false }
  }

  return { state: updateGameStatus({ ...state, grid }), applied: true }
}

/** Reveal the full solution and mark the game as revealed. */
export function revealSolution(state: GameState): GameState {
  const grid = state.grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      deleted: !cell.solution,
      circle: cell.solution,
      mistake: false,
      hint: false,
    })),
  )

  return {
    ...state,
    grid,
    rowStatus: Array(state.rowSums.length).fill("correct"),
    colStatus: Array(state.colSums.length).fill("correct"),
    gameRevealed: true,
  }
}

/** Flag every cell currently in the wrong state. Returns new state + count. */
export function markMistakes(state: GameState): { state: GameState; count: number } {
  let count = 0
  const grid = state.grid.map((row) =>
    row.map((cell) => {
      const mistake = (cell.solution && cell.deleted) || (!cell.solution && cell.circle)
      if (mistake) count++
      return { ...cell, mistake }
    }),
  )
  return { state: { ...state, grid }, count }
}

/** Clear all mistake-flagged cells back to normal. */
export function removeMistakes(state: GameState): GameState {
  const grid = state.grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      deleted: cell.mistake ? false : cell.deleted,
      circle: cell.mistake ? false : cell.circle,
      mistake: false,
    })),
  )
  return updateGameStatus({ ...state, grid })
}
