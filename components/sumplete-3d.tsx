"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Eye,
  Share2,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import {
  generateGame,
  toggleDelete,
  applyHint,
  revealSolution,
  markMistakes,
  removeMistakes,
  type GameState,
} from "@/lib/sumplete-engine"
import { play, unlockAudio, isMuted, setMuted as setSoundMuted } from "@/lib/sound"
import type { GameSceneProps } from "@/components/board/GameScene"

// The three.js scene is client-only (it builds canvas textures from `document`).
const GameScene = dynamic<GameSceneProps>(() => import("@/components/board/GameScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading 3D board…
    </div>
  ),
})

const center = (size: number) => Math.floor((size - 1) / 2)
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))

export function Sumplete3D() {
  const [gridSize, setGridSize] = useState(3)
  const [allowNegative, setAllowNegative] = useState(false)
  const [gameState, setGameState] = useState<GameState>(() => generateGame(3, false))
  const [showMistakes, setShowMistakes] = useState(false)
  const [muted, setMuted] = useState(false)
  const [winCount, setWinCount] = useState(0)
  const [charPos, setCharPos] = useState({ row: 1, col: 1 })
  const [jumpKey, setJumpKey] = useState(0)

  const disabled = gameState.gameWon || gameState.gameRevealed

  // Refs let the global key handler read the latest state without re-binding.
  const gameStateRef = useRef(gameState)
  const charPosRef = useRef(charPos)
  const sizeRef = useRef(gridSize)
  gameStateRef.current = gameState
  charPosRef.current = charPos
  sizeRef.current = gridSize

  const firstSizeEffect = useRef(true)
  const skipReset = useRef(false)

  // New puzzle whenever the grid size changes (but not on mount/restore).
  useEffect(() => {
    if (firstSizeEffect.current) {
      firstSizeEffect.current = false
      return
    }
    if (skipReset.current) {
      skipReset.current = false
      return
    }
    setGameState(generateGame(gridSize, allowNegative))
    setShowMistakes(false)
    setCharPos({ row: center(gridSize), col: center(gridSize) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize])

  // Persist.
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("sumplete-game", JSON.stringify(gameState))
    localStorage.setItem("sumplete-size", gridSize.toString())
    localStorage.setItem("sumplete-negative", allowNegative.toString())
  }, [gameState, gridSize, allowNegative])

  // Restore on mount.
  useEffect(() => {
    if (typeof window === "undefined") return
    setMuted(isMuted())
    const savedSize = localStorage.getItem("sumplete-size")
    const savedNegative = localStorage.getItem("sumplete-negative")
    const savedGame = localStorage.getItem("sumplete-game")
    if (savedSize) {
      const parsed = Number.parseInt(savedSize)
      if (parsed !== gridSize) skipReset.current = true
      setGridSize(parsed)
      setCharPos({ row: center(parsed), col: center(parsed) })
    }
    if (savedNegative) setAllowNegative(savedNegative === "true")
    if (savedGame) {
      try {
        setGameState(JSON.parse(savedGame))
      } catch {
        setGameState(generateGame(gridSize, allowNegative))
      }
    }
  }, [])

  function resetGame() {
    setGameState(generateGame(gridSize, allowNegative))
    setShowMistakes(false)
    setCharPos({ row: center(gridSize), col: center(gridSize) })
  }

  // --- Character controls (keyboard + on-screen) ---

  const move = useCallback((dRow: number, dCol: number) => {
    const size = sizeRef.current
    const p = charPosRef.current
    const row = clamp(p.row + dRow, size - 1)
    const col = clamp(p.col + dCol, size - 1)
    if (row === p.row && col === p.col) return
    unlockAudio()
    play("step")
    setCharPos({ row, col })
  }, [])

  const jump = useCallback(() => {
    const p = charPosRef.current
    const prev = gameStateRef.current
    unlockAudio()
    setJumpKey((k) => k + 1)
    play("jump")

    const { state, result } = toggleDelete(prev, p.row, p.col)
    if (result === "blocked") return
    if (result === "deleted") play("delete")

    if (state.gameWon && !prev.gameWon) {
      setWinCount((c) => c + 1)
      play("win")
    } else {
      const newlyCorrect =
        state.rowStatus.some((s, i) => s === "correct" && prev.rowStatus[i] !== "correct") ||
        state.colStatus.some((s, j) => s === "correct" && prev.colStatus[j] !== "correct")
      if (newlyCorrect) play("correct")
    }
    setGameState(state)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null
      const tag = ae?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (document.querySelector('[role="listbox"]')) return // a Select is open
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          move(-1, 0)
          break
        case "ArrowDown":
          e.preventDefault()
          move(1, 0)
          break
        case "ArrowLeft":
          e.preventDefault()
          move(0, -1)
          break
        case "ArrowRight":
          e.preventDefault()
          move(0, 1)
          break
        case " ":
          if (tag === "BUTTON") return // let Space activate a focused button
          e.preventDefault()
          jump()
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [move, jump])

  // --- Helper actions ---

  function handleHint() {
    unlockAudio()
    const { state, applied } = applyHint(gameState)
    if (applied) {
      play("click")
      setGameState(state)
    }
  }

  function handleReveal() {
    if (window.confirm("Are you sure you want to reveal the solution to this puzzle?")) {
      setGameState(revealSolution(gameState))
    }
  }

  function handleCheckMistakes() {
    unlockAudio()
    const { state, count } = markMistakes(gameState)
    play(count > 0 ? "error" : "correct")
    setGameState(state)
    setShowMistakes(true)
  }

  function handleRemoveMistakes() {
    setGameState(removeMistakes(gameState))
    setShowMistakes(false)
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    setSoundMuted(next)
    if (!next) {
      unlockAudio()
      play("click")
    }
  }

  function shareGame() {
    const inviteMessage = "Have you tried this logic puzzle platformer? - Sumplete Runner"
    if (navigator.share) {
      navigator.share({ text: inviteMessage }).catch((err) => console.error("Share failed:", err))
    } else {
      navigator.clipboard
        .writeText(inviteMessage)
        .then(() => alert("Invite message copied to clipboard."))
        .catch((err) => console.error("Copy failed:", err))
    }
  }

  return (
    <Card className="w-full p-4 md:p-6 shadow-lg">
      <div className="flex flex-col items-center space-y-4 md:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Sumplete Runner</h1>
          <p className="text-sm text-muted-foreground">
            Walk the hopper with the arrow keys and press <span className="font-semibold">Space</span> to jump:
            jump on a number to cross it out, jump again to restore it. Clear each row/column down to its target sum.
          </p>
        </div>

        <div className="relative w-full h-[60vh] min-h-[380px] overflow-hidden rounded-xl border border-gray-700 bg-[#0a0a12]">
          <GameScene
            key={gridSize}
            size={gridSize}
            grid={gameState.grid}
            rowSums={gameState.rowSums}
            colSums={gameState.colSums}
            rowStatus={gameState.rowStatus}
            colStatus={gameState.colStatus}
            charRow={charPos.row}
            charCol={charPos.col}
            jumpKey={jumpKey}
            winCount={winCount}
          />

          {disabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="text-center p-4">
                <div className="text-xl md:text-2xl font-bold mb-3">
                  {gameState.gameWon ? "Puzzle Solved! Well done!" : "Solution revealed"}
                </div>
                <Button onClick={resetGame} size="lg">
                  Play Again
                </Button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleMute}
            className="absolute right-3 top-3 z-20 rounded-md bg-black/40 p-2 text-white/80 backdrop-blur hover:text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>

        {/* On-screen controls (touch / no keyboard). */}
        <div className="flex items-center justify-center gap-6">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <Button variant="outline" size="icon" aria-label="Up" onClick={() => move(-1, 0)}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <span />
            <Button variant="outline" size="icon" aria-label="Left" onClick={() => move(0, -1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Down" onClick={() => move(1, 0)}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Right" onClick={() => move(0, 1)}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Button className="h-16 px-6 text-base" onClick={jump} disabled={disabled}>
            Jump
          </Button>
        </div>

        {!disabled && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckMistakes}
                className={showMistakes ? "bg-red-100 dark:bg-red-900/20" : ""}
              >
                <AlertCircle className="mr-1 h-4 w-4" />
                Errors
              </Button>
              <Button variant="outline" size="sm" onClick={handleHint}>
                <Lightbulb className="mr-1 h-4 w-4" />
                Hint
              </Button>
              <Button variant="outline" size="sm" onClick={resetGame}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Restart
              </Button>
              <Button variant="outline" size="sm" onClick={handleReveal}>
                <Eye className="mr-1 h-4 w-4" />
                Reveal
              </Button>
              {showMistakes && (
                <Button variant="outline" size="sm" onClick={handleRemoveMistakes}>
                  Remove mistakes
                </Button>
              )}
            </div>

            <div className="mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-center font-medium mb-3">New Game Options</h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow-negative"
                    checked={allowNegative}
                    onCheckedChange={(checked) => setAllowNegative(checked === true)}
                  />
                  <label htmlFor="allow-negative" className="text-sm font-medium leading-none">
                    Negative numbers?
                  </label>
                </div>
              </div>

              <div className="flex justify-center gap-2 mt-4">
                <Button onClick={resetGame}>New Puzzle</Button>
                <Button variant="outline" onClick={shareGame}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
