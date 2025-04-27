"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, Lightbulb, RotateCcw, Eye, Check, X, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import React from "react"

type CellState = {
  value: number
  deleted: boolean
  circle: boolean
  mistake: boolean
  hint: boolean
  solution: boolean
}

type GameState = {
  grid: CellState[][]
  rowSums: number[]
  colSums: number[]
  rowStatus: ("correct" | "incorrect" | "pending")[]
  colStatus: ("correct" | "incorrect" | "pending")[]
  gameWon: boolean
  gameRevealed: boolean
}

export function Sumplete() {
  const [gridSize, setGridSize] = useState(4)
  const [gameState, setGameState] = useState<GameState>(() => generateGame(gridSize))
  const [showMistakes, setShowMistakes] = useState(false)
  const [showNewGameOptions, setShowNewGameOptions] = useState(false)

  // Generate a new game when grid size changes
  useEffect(() => {
    resetGame()
  }, [gridSize])

  // Save game to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sumplete-game", JSON.stringify(gameState))
      localStorage.setItem("sumplete-size", gridSize.toString())
    }
  }, [gameState, gridSize])

  // Load game from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGame = localStorage.getItem("sumplete-game")
      const savedSize = localStorage.getItem("sumplete-size")

      if (savedSize) {
        setGridSize(Number.parseInt(savedSize))
      }

      if (savedGame) {
        try {
          setGameState(JSON.parse(savedGame))
        } catch (e) {
          console.error("Failed to parse saved game", e)
          resetGame()
        }
      }
    }
  }, [])

  function generateGame(size: number): GameState {
    const numberSize = size - 1
    const grid: CellState[][] = []

    // Generate grid with random numbers
    for (let i = 0; i < numberSize; i++) {
      const row: CellState[] = []
      for (let j = 0; j < numberSize; j++) {
        const value = Math.floor(Math.random() * 9) + 1
        const isSolution = Math.random() < 0.5
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

    // Calculate row sums
    const rowSums: number[] = []
    for (let i = 0; i < numberSize; i++) {
      let sum = 0
      for (let j = 0; j < numberSize; j++) {
        if (grid[i][j].solution) {
          sum += grid[i][j].value
        }
      }
      rowSums.push(sum)
    }

    // Calculate column sums
    const colSums: number[] = []
    for (let j = 0; j < numberSize; j++) {
      let sum = 0
      for (let i = 0; i < numberSize; i++) {
        if (grid[i][j].solution) {
          sum += grid[i][j].value
        }
      }
      colSums.push(sum)
    }

    return {
      grid,
      rowSums,
      colSums,
      rowStatus: Array(numberSize).fill("pending"),
      colStatus: Array(numberSize).fill("pending"),
      gameWon: false,
      gameRevealed: false,
    }
  }

  function resetGame() {
    setGameState(generateGame(gridSize))
    setShowMistakes(false)
    setShowNewGameOptions(false)
  }

  function toggleCell(row: number, col: number) {
    if (gameState.gameWon || gameState.gameRevealed) return
    if (gameState.grid[row][col].hint) return

    const newGrid = [...gameState.grid]
    const cell = newGrid[row][col]

    if (cell.mistake) {
      cell.deleted = false
      cell.circle = false
      cell.mistake = false
    } else if (cell.deleted) {
      cell.deleted = false
      cell.circle = true
    } else if (cell.circle) {
      cell.circle = false
    } else {
      cell.deleted = true
      cell.circle = false
    }

    const newGameState = {
      ...gameState,
      grid: newGrid,
    }

    updateGameStatus(newGameState)
    setGameState(newGameState)
  }

  function updateGameStatus(state: GameState) {
    const { grid, rowSums, colSums } = state
    const rows = grid.length
    const cols = grid[0].length

    // Check row sums
    const rowStatus = rowSums.map((targetSum, rowIndex) => {
      const currentSum = grid[rowIndex].filter((cell) => !cell.deleted).reduce((sum, cell) => sum + cell.value, 0)

      return currentSum === targetSum ? "correct" : "incorrect"
    })

    // Check column sums
    const colStatus = colSums.map((targetSum, colIndex) => {
      let currentSum = 0
      for (let i = 0; i < rows; i++) {
        if (!grid[i][colIndex].deleted) {
          currentSum += grid[i][colIndex].value
        }
      }

      return currentSum === targetSum ? "correct" : "incorrect"
    })

    // Check if game is won
    const gameWon =
      rowStatus.every((status) => status === "correct") && colStatus.every((status) => status === "correct")

    state.rowStatus = rowStatus
    state.colStatus = colStatus
    state.gameWon = gameWon
  }

  function showHint() {
    if (gameState.gameWon || gameState.gameRevealed) return

    const newGrid = [...gameState.grid]
    const rows = newGrid.length
    const cols = newGrid[0].length

    // Find cells that should be deleted but aren't
    const incorrectCells = []
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = newGrid[i][j]
        if (!cell.solution && !cell.deleted && !cell.hint) {
          incorrectCells.push({ i, j })
        }
      }
    }

    // Find cells that should be kept but are deleted
    const deletedIncorrectly = []
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = newGrid[i][j]
        if (cell.solution && cell.deleted && !cell.hint) {
          deletedIncorrectly.push({ i, j })
        }
      }
    }

    // Choose a random cell to hint
    if (incorrectCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * incorrectCells.length)
      const { i, j } = incorrectCells[randomIndex]
      newGrid[i][j].hint = true
      newGrid[i][j].deleted = true
    } else if (deletedIncorrectly.length > 0) {
      const randomIndex = Math.floor(Math.random() * deletedIncorrectly.length)
      const { i, j } = deletedIncorrectly[randomIndex]
      newGrid[i][j].hint = true
      newGrid[i][j].deleted = false
    }

    setGameState({
      ...gameState,
      grid: newGrid,
    })
  }

  function revealSolution() {
    if (window.confirm("Are you sure you want to reveal the solution to this puzzle?")) {
      const newGrid = gameState.grid.map((row) =>
        row.map((cell) => ({
          ...cell,
          deleted: !cell.solution,
          circle: cell.solution,
          mistake: false,
          hint: false,
        })),
      )

      setGameState({
        ...gameState,
        grid: newGrid,
        rowStatus: Array(gameState.rowSums.length).fill("correct"),
        colStatus: Array(gameState.colSums.length).fill("correct"),
        gameRevealed: true,
      })
    }
  }

  function checkMistakes() {
    const newGrid = gameState.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        mistake: (cell.solution && cell.deleted) || (!cell.solution && cell.circle),
      })),
    )

    setGameState({
      ...gameState,
      grid: newGrid,
    })

    setShowMistakes(true)
  }

  function removeMistakes() {
    const newGrid = gameState.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        deleted: cell.mistake ? false : cell.deleted,
        circle: cell.mistake ? false : cell.circle,
        mistake: false,
      })),
    )

    setGameState({
      ...gameState,
      grid: newGrid,
    })

    setShowMistakes(false)
  }

  function shareGame() {
    const inviteMessage = "Have you tried this logic puzzle game? - Sumplete"

    if (navigator.share) {
      navigator
        .share({
          text: inviteMessage,
        })
        .catch((err) => {
          console.error("Share failed:", err)
        })
    } else {
      // Fallback to clipboard
      navigator.clipboard
        .writeText(inviteMessage)
        .then(() => {
          alert("Invite message copied to clipboard.")
        })
        .catch((err) => {
          console.error("Copy failed:", err)
        })
    }
  }

  const numberSize = gridSize - 1

  return (
    <Card className="w-full p-4 md:p-6 shadow-lg">
      <div className="flex flex-col items-center space-y-4 md:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Sumplete</h1>
          <p className="text-sm text-muted-foreground">
            Delete numbers so each row/column adds up to the target number at the right/bottom.
          </p>
        </div>

        <div className="relative w-full">
          {(gameState.gameWon || gameState.gameRevealed) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
              <div className="text-center p-4">
                <div className="text-xl md:text-2xl font-bold mb-2">
                  {gameState.gameWon ? "Puzzle Solved! Well done!" : "Better luck next time!"}
                </div>
                <div className="flex flex-col space-y-2">
                  <Button onClick={resetGame} size="lg">
                    Play Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              width: "100%",
            }}
          >
            {/* First row: Column headers */}
            {Array(gridSize)
              .fill(0)
              .map((_, index) => {
                if (index === gridSize - 1) {
                  // Empty top-right corner
                  return <div key={`header-${index}`} className="flex items-center justify-center"></div>
                } else {
                  // Column headers (sums)
                  return (
                    <div
                      key={`header-${index}`}
                      className={cn(
                        "flex items-center justify-center font-medium h-10",
                        gameState.colStatus[index] === "correct" ? "text-green-500 dark:text-green-400" : "",
                      )}
                    >
                      {gameState.colSums[index]}
                      {gameState.colStatus[index] === "correct" && <Check className="ml-1 h-3 w-3" />}
                    </div>
                  )
                }
              })}

            {/* Game grid rows */}
            {gameState.grid.map((row, rowIndex) => (
              <React.Fragment key={`row-${rowIndex}`}>
                {/* Game cells */}
                {row.map((cell, colIndex) => (
                  <button
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={cn(
                      "flex items-center justify-center text-lg font-medium border transition-colors relative aspect-square",
                      "border-gray-400 dark:border-gray-600",
                      cell.deleted || cell.circle ? "bg-card" : "bg-card hover:bg-accent",
                      cell.mistake ? "bg-red-100 dark:bg-red-900/30" : "",
                      cell.hint ? "bg-blue-100 dark:bg-blue-900/30" : "",
                    )}
                    onClick={() => toggleCell(rowIndex, colIndex)}
                    disabled={gameState.gameWon || gameState.gameRevealed}
                  >
                    <span className={cn(cell.deleted && "text-muted-foreground")}>{cell.value}</span>

                    {cell.deleted && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <X className="h-full w-full text-red-500/40 dark:text-red-400/40" strokeWidth={1.5} />
                      </div>
                    )}

                    {cell.circle && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[85%] h-[85%] border-[4px] border-green-500/50 dark:border-green-400/50 rounded-full" />
                      </div>
                    )}
                  </button>
                ))}

                {/* Row sum (last column) */}
                <div
                  className={cn(
                    "flex items-center justify-center font-medium",
                    gameState.rowStatus[rowIndex] === "correct" ? "text-green-500 dark:text-green-400" : "",
                  )}
                >
                  {gameState.rowSums[rowIndex]}
                  {gameState.rowStatus[rowIndex] === "correct" && <Check className="ml-1 h-3 w-3" />}
                </div>
              </React.Fragment>
            ))}

            {/* Bottom row: Column sums (repeated at bottom for clarity) */}
            {Array(gridSize)
              .fill(0)
              .map((_, index) => {
                if (index === gridSize - 1) {
                  // Empty bottom-right corner
                  return <div key={`footer-${index}`} className="flex items-center justify-center"></div>
                } else {
                  // Column sums at bottom
                  return (
                    <div
                      key={`footer-${index}`}
                      className={cn(
                        "flex items-center justify-center font-medium h-10 text-muted-foreground",
                        gameState.colStatus[index] === "correct" ? "text-green-500/70 dark:text-green-400/70" : "",
                      )}
                    >
                      {gameState.colSums[index]}
                    </div>
                  )
                }
              })}
          </div>
        </div>

        {!gameState.gameWon && !gameState.gameRevealed && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={checkMistakes}
                className={showMistakes ? "bg-red-100 dark:bg-red-900/20" : ""}
              >
                <AlertCircle className="mr-1 h-4 w-4" />
                Errors
              </Button>
              <Button variant="outline" size="sm" onClick={showHint}>
                <Lightbulb className="mr-1 h-4 w-4" />
                Hint
              </Button>
              <Button variant="outline" size="sm" onClick={resetGame}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Restart
              </Button>
              <Button variant="outline" size="sm" onClick={revealSolution}>
                <Eye className="mr-1 h-4 w-4" />
                Reveal
              </Button>
              {showMistakes && (
                <Button variant="outline" size="sm" onClick={removeMistakes}>
                  Remove mistakes
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <Select value={gridSize.toString()} onValueChange={(value) => setGridSize(Number.parseInt(value))}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3x3 (beginner)</SelectItem>
                  <SelectItem value="4">4x4 (easy)</SelectItem>
                  <SelectItem value="5">5x5 (intermediate)</SelectItem>
                  <SelectItem value="6">6x6 (challenging)</SelectItem>
                  <SelectItem value="7">7x7 (advanced)</SelectItem>
                  <SelectItem value="8">8x8 (expert)</SelectItem>
                  <SelectItem value="9">9x9 (master)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={resetGame}>New Puzzle</Button>
              <Button variant="outline" onClick={shareGame}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
