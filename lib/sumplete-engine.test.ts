import { describe, it, expect } from "vitest"
import {
  generateGame,
  updateGameStatus,
  cycleCell,
  toggleDelete,
  applyHint,
  revealSolution,
  markMistakes,
  removeMistakes,
  type GameState,
  type CellState,
} from "./sumplete-engine"

// Build a deterministic state from a value grid + matching solution-flag grid.
function makeState(values: number[][], solutions: boolean[][]): GameState {
  const size = values.length
  const grid: CellState[][] = values.map((row, i) =>
    row.map((value, j) => ({
      value,
      deleted: false,
      circle: false,
      mistake: false,
      hint: false,
      solution: solutions[i][j],
    })),
  )
  const rowSums = grid.map((row) => row.reduce((s, c) => (c.solution ? s + c.value : s), 0))
  const colSums = values[0].map((_, j) =>
    grid.reduce((s, row) => (row[j].solution ? s + row[j].value : s), 0),
  )
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

describe("generateGame", () => {
  it("publishes row/col targets equal to the sum of solution cells", () => {
    const state = generateGame(5, false)
    for (let i = 0; i < 5; i++) {
      const expected = state.grid[i].reduce((s, c) => (c.solution ? s + c.value : s), 0)
      expect(state.rowSums[i]).toBe(expected)
    }
    for (let j = 0; j < 5; j++) {
      const expected = state.grid.reduce((s, row) => (row[j].solution ? s + row[j].value : s), 0)
      expect(state.colSums[j]).toBe(expected)
    }
  })

  it("keeps values in [1,9] without negatives and [-9,9] with negatives", () => {
    const pos = generateGame(6, false)
    pos.grid.flat().forEach((c) => expect(c.value).toBeGreaterThanOrEqual(1))
    pos.grid.flat().forEach((c) => expect(c.value).toBeLessThanOrEqual(9))

    const neg = generateGame(6, true)
    neg.grid.flat().forEach((c) => {
      expect(c.value).toBeGreaterThanOrEqual(-9)
      expect(c.value).toBeLessThanOrEqual(9)
    })
  })
})

describe("cycleCell", () => {
  const fresh = () => makeState([[1, 2], [3, 4]], [[true, false], [false, true]])

  it("cycles normal → deleted → circle → normal", () => {
    let s = fresh()

    let r = cycleCell(s, 0, 0)
    expect(r.result).toBe("deleted")
    expect(r.state.grid[0][0].deleted).toBe(true)

    r = cycleCell(r.state, 0, 0)
    expect(r.result).toBe("circle")
    expect(r.state.grid[0][0].circle).toBe(true)
    expect(r.state.grid[0][0].deleted).toBe(false)

    r = cycleCell(r.state, 0, 0)
    expect(r.result).toBe("normal")
    expect(r.state.grid[0][0].circle).toBe(false)
    expect(r.state.grid[0][0].deleted).toBe(false)
  })

  it("returns a mistake cell straight to normal", () => {
    const s = fresh()
    s.grid[0][1].mistake = true
    s.grid[0][1].circle = true
    const r = cycleCell(s, 0, 1)
    expect(r.result).toBe("normal")
    expect(r.state.grid[0][1].mistake).toBe(false)
    expect(r.state.grid[0][1].circle).toBe(false)
  })

  it("blocks clicks on hint cells and won/revealed games", () => {
    const s = fresh()
    s.grid[0][0].hint = true
    expect(cycleCell(s, 0, 0).result).toBe("blocked")

    const won = fresh()
    won.gameWon = true
    expect(cycleCell(won, 1, 1).result).toBe("blocked")
  })

  it("does not mutate the input state", () => {
    const s = fresh()
    cycleCell(s, 0, 0)
    expect(s.grid[0][0].deleted).toBe(false)
  })
})

describe("toggleDelete (jump mechanic)", () => {
  const fresh = () => makeState([[1, 2], [3, 4]], [[true, false], [false, true]])

  it("deletes on first jump, restores on second", () => {
    let s = fresh()
    let r = toggleDelete(s, 0, 1)
    expect(r.result).toBe("deleted")
    expect(r.state.grid[0][1].deleted).toBe(true)

    r = toggleDelete(r.state, 0, 1)
    expect(r.result).toBe("restored")
    expect(r.state.grid[0][1].deleted).toBe(false)
  })

  it("blocks hint cells and finished games", () => {
    const s = fresh()
    s.grid[0][0].hint = true
    expect(toggleDelete(s, 0, 0).result).toBe("blocked")
    const won = fresh()
    won.gameRevealed = true
    expect(toggleDelete(won, 1, 1).result).toBe("blocked")
  })

  it("wins when the right cells are crossed out", () => {
    let s = fresh()
    s = toggleDelete(s, 0, 1).state
    s = toggleDelete(s, 1, 0).state
    expect(s.gameWon).toBe(true)
  })
})

describe("updateGameStatus / win detection", () => {
  it("reports win only when every row and column matches its target", () => {
    // Solution keeps [0][0]=1 and [1][1]=4; the off-diagonal must be deleted.
    let s = makeState([[1, 2], [3, 4]], [[true, false], [false, true]])

    s = updateGameStatus(s)
    expect(s.gameWon).toBe(false)

    // Delete the two non-solution cells.
    s = cycleCell(s, 0, 1).state // delete the 2
    s = cycleCell(s, 1, 0).state // delete the 3
    expect(s.gameWon).toBe(true)
    expect(s.rowStatus.every((x) => x === "correct")).toBe(true)
    expect(s.colStatus.every((x) => x === "correct")).toBe(true)
  })
})

describe("applyHint", () => {
  it("deletes a cell that should be deleted and locks it", () => {
    const s = makeState([[1, 2], [3, 4]], [[true, false], [false, true]])
    const r = applyHint(s, () => 0) // pick first candidate
    expect(r.applied).toBe(true)
    const hinted = r.state.grid.flat().find((c) => c.hint)!
    expect(hinted.solution).toBe(false)
    expect(hinted.deleted).toBe(true)
  })

  it("restores a wrongly-deleted solution cell and locks it", () => {
    const s = makeState([[1, 2], [3, 4]], [[true, false], [false, true]])
    // Wrongly delete a solution cell; also delete the only non-solution targets
    // so the only available hint is the restore branch.
    s.grid[0][1].deleted = true // non-solution deleted (correct)
    s.grid[1][0].deleted = true // non-solution deleted (correct)
    s.grid[0][0].deleted = true // SOLUTION wrongly deleted
    s.grid[1][1].deleted = true // SOLUTION wrongly deleted
    const r = applyHint(s, () => 0)
    expect(r.applied).toBe(true)
    const hinted = r.state.grid.flat().find((c) => c.hint)!
    expect(hinted.solution).toBe(true)
    expect(hinted.deleted).toBe(false)
  })

  it("does nothing when the board is already correct", () => {
    let s = makeState([[1, 2], [3, 4]], [[true, false], [false, true]])
    s = cycleCell(s, 0, 1).state
    s = cycleCell(s, 1, 0).state
    expect(applyHint(s, () => 0).applied).toBe(false)
  })
})

describe("reveal / mistakes", () => {
  it("revealSolution deletes non-solution cells and wins", () => {
    const s = revealSolution(makeState([[1, 2], [3, 4]], [[true, false], [false, true]]))
    expect(s.gameRevealed).toBe(true)
    expect(s.grid[0][1].deleted).toBe(true)
    expect(s.grid[0][0].deleted).toBe(false)
    expect(s.grid[0][0].circle).toBe(true)
  })

  it("markMistakes flags wrong cells; removeMistakes clears them", () => {
    const s = makeState([[1, 2], [3, 4]], [[true, false], [false, true]])
    s.grid[0][0].deleted = true // solution wrongly deleted → mistake
    s.grid[0][1].circle = true // non-solution wrongly circled → mistake
    const marked = markMistakes(s)
    expect(marked.count).toBe(2)
    expect(marked.state.grid[0][0].mistake).toBe(true)

    const cleared = removeMistakes(marked.state)
    expect(cleared.grid[0][0].deleted).toBe(false)
    expect(cleared.grid[0][1].circle).toBe(false)
    expect(cleared.grid.flat().some((c) => c.mistake)).toBe(false)
  })
})
